import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { getSession } from '@/lib/auth';
import { getRateLimitIdentity } from '@/lib/client-ip';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';
import { authorizeUploadPurpose, UploadAssetAuthorizationError } from '@/lib/services/upload-asset.service';
import {
  finalizeUploadReservation,
  recordReservationStorageKeys,
  releaseUploadReservation,
  reserveUploadQuota,
  UploadQuotaBackendError,
  UploadQuotaExceededError,
  type UploadQuotaReservation,
} from '@/lib/services/upload-quota.service';
import { StorageService } from '@/lib/services/storage.service';
import {
  parseUploadPurpose,
  UploadPolicyError,
  validateContentLength,
  validateUploadBuffer,
  validateUploadCount,
} from '@/lib/upload-policy';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CLIENT_CONTROLLED_STORAGE_FIELDS = ['key', 'storageKey', 'userId', 'ownerId'] as const;

type UploadedResult = {
  key: string;
  url: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

function isFileEntry(value: FormDataEntryValue): value is File {
  return typeof value !== 'string'
    && typeof value.name === 'string'
    && typeof value.type === 'string'
    && typeof value.size === 'number'
    && typeof value.arrayBuffer === 'function';
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof UploadPolicyError || error instanceof UploadAssetAuthorizationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof UploadQuotaExceededError) {
    const retryAfter = Math.max(1, Math.ceil((error.resetAt.getTime() - Date.now()) / 1000));
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { 'Retry-After': retryAfter.toString() } },
    );
  }
  if (error instanceof UploadQuotaBackendError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  logger.warn('[UPLOAD_ERROR]', { errorType: error instanceof Error ? error.name : 'unknown' });
  return NextResponse.json({ error: 'Upload failed', code: 'UPLOAD_FAILED' }, { status: 500 });
}

export async function secureUploadPost(req: Request) {
  let reservation: UploadQuotaReservation | undefined;
  const uploadedKeys: string[] = [];

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication is required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401 },
      );
    }

    const limiter = await rateLimit(
      getRateLimitIdentity(req, 'upload', session.userId),
      { windowMs: 60 * 1000, max: env.UPLOAD_REQUEST_LIMIT, failureMode: 'closed' },
    );
    if (!limiter.success) return getRateLimitResponse(limiter);

    validateContentLength(req);
    const formData = await req.formData();
    for (const field of CLIENT_CONTROLLED_STORAGE_FIELDS) {
      if (formData.has(field)) {
        throw new UploadPolicyError('Storage ownership and keys are server-controlled', 'UPLOAD_CLIENT_KEY_FORBIDDEN', 400);
      }
    }

    const purpose = parseUploadPurpose(formData.get('purpose'));
    const rawResourceId = formData.get('resourceId');
    if (rawResourceId !== null && typeof rawResourceId !== 'string') {
      throw new UploadPolicyError('Invalid resource id', 'UPLOAD_INVALID_RESOURCE', 400);
    }
    const resourceId = typeof rawResourceId === 'string' && rawResourceId.trim()
      ? rawResourceId.trim()
      : undefined;
    if (resourceId && (resourceId.length > 191 || /[\0-\x1f\x7f]/.test(resourceId))) {
      throw new UploadPolicyError('Invalid resource id', 'UPLOAD_INVALID_RESOURCE', 400);
    }

    await prisma.$transaction((tx) => authorizeUploadPurpose(tx, session, purpose, resourceId));

    const entries = formData.getAll('file');
    validateUploadCount(entries.length, purpose);
    if (!entries.every(isFileEntry)) {
      throw new UploadPolicyError('Every upload entry must be a file', 'UPLOAD_INVALID_FILE', 400);
    }
    const files = entries as File[];
    if (files.some((file) => file.size <= 0)) {
      throw new UploadPolicyError('Empty files are not allowed', 'UPLOAD_EMPTY_FILE', 400);
    }
    if (files.some((file) => file.size > Math.min(MAX_FILE_SIZE, env.MAX_FILE_SIZE))) {
      throw new UploadPolicyError('File exceeds the configured size limit', 'UPLOAD_FILE_TOO_LARGE', 413);
    }

    const validatedFiles = await Promise.all(files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validMagicBytes = await StorageService.validateFile(buffer, file.type);
      if (!validMagicBytes) {
        throw new UploadPolicyError('File content does not match an allowed image type', 'UPLOAD_INVALID_TYPE', 400);
      }
      const validated = validateUploadBuffer(buffer, file.name, file.type);
      return { buffer, validated };
    }));

    reservation = await reserveUploadQuota(
      session.userId,
      validatedFiles.map(({ validated }) => validated.sizeBytes),
    );

    const uploaded: UploadedResult[] = [];
    for (const { buffer, validated } of validatedFiles) {
      const key = await StorageService.upload(buffer, validated.originalName, validated.mimeType);
      uploadedKeys.push(key);
      await recordReservationStorageKeys(reservation.id, uploadedKeys);
      uploaded.push({ key, url: StorageService.getUrl(key), ...validated });
    }

    await finalizeUploadReservation(
      reservation,
      uploaded.map(({ key, ...file }) => ({
        ...file,
        storageKey: key,
        purpose,
        ...(purpose === 'product' && resourceId ? { resourceId } : {}),
      })),
    );
    reservation = undefined;

    const first = uploaded[0];
    return NextResponse.json({ url: first.url, key: first.key, files: uploaded });
  } catch (error) {
    if (reservation) {
      let recordedKeys: string[] = [];
      try {
        recordedKeys = await releaseUploadReservation(reservation.id);
      } catch (releaseError) {
        logger.warn('[UPLOAD_QUOTA_RELEASE]', { errorType: releaseError instanceof Error ? releaseError.name : 'unknown' });
      }
      const keysToDelete = [...new Set([...uploadedKeys, ...recordedKeys])];
      await Promise.allSettled(keysToDelete.map((key) => StorageService.delete(key)));
    }
    return errorResponse(error);
  }
}
