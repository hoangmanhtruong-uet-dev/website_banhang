import path from 'node:path';
import { env } from '@/config/env';

export type UploadPurpose = 'avatar' | 'product';
export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export class UploadPolicyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const MIME_EXTENSIONS: Record<AllowedImageMime, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze(Object.keys(MIME_EXTENSIONS) as AllowedImageMime[]);
export const MAX_UPLOAD_REQUEST_BYTES = env.MAX_FILE_SIZE * env.UPLOAD_MAX_FILES_PER_REQUEST + 1024 * 1024;

export function parseUploadPurpose(value: FormDataEntryValue | null): UploadPurpose {
  // Avatar remains the default for backward compatibility with the original one-file API.
  if (value === null || value === '') return 'avatar';
  if (value === 'avatar' || value === 'product') return value;
  throw new UploadPolicyError('Unsupported upload purpose', 'UPLOAD_INVALID_PURPOSE', 400);
}

export function validateUploadCount(count: number, purpose: UploadPurpose): void {
  const limit = purpose === 'avatar' ? 1 : env.UPLOAD_MAX_FILES_PER_REQUEST;
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new UploadPolicyError('No upload file was provided', 'UPLOAD_FILE_REQUIRED', 400);
  }
  if (count > limit) {
    throw new UploadPolicyError(`At most ${limit} file(s) can be uploaded per request`, 'UPLOAD_FILE_COUNT_EXCEEDED', 400);
  }
}

export function validateContentLength(request: Request): void {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return;
  if (!/^\d+$/.test(rawLength)) {
    throw new UploadPolicyError('Invalid Content-Length header', 'UPLOAD_INVALID_CONTENT_LENGTH', 400);
  }
  const contentLength = Number(rawLength);
  if (!Number.isSafeInteger(contentLength) || contentLength > MAX_UPLOAD_REQUEST_BYTES) {
    throw new UploadPolicyError('Upload request is too large', 'UPLOAD_REQUEST_TOO_LARGE', 413);
  }
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 45
    && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    && buffer.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'));
}

function isGif(buffer: Buffer): boolean {
  if (buffer.length < 14 || buffer[buffer.length - 1] !== 0x3b) return false;
  const signature = buffer.subarray(0, 6).toString('ascii');
  return signature === 'GIF87a' || signature === 'GIF89a';
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff
    && buffer[buffer.length - 2] === 0xff
    && buffer[buffer.length - 1] === 0xd9;
}

function isWebp(buffer: Buffer): boolean {
  if (buffer.length < 20) return false;
  if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF') return false;
  if (buffer.subarray(8, 12).toString('ascii') !== 'WEBP') return false;
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (!['VP8 ', 'VP8L', 'VP8X'].includes(chunk)) return false;
  const declaredRiffLength = buffer.readUInt32LE(4) + 8;
  return declaredRiffLength === buffer.length;
}

export function detectAllowedImageMime(buffer: Buffer): AllowedImageMime | null {
  if (isPng(buffer)) return 'image/png';
  if (isJpeg(buffer)) return 'image/jpeg';
  if (isGif(buffer)) return 'image/gif';
  if (isWebp(buffer)) return 'image/webp';
  return null;
}

export function canonicalExtensionForMime(mimeType: AllowedImageMime): string {
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/gif') return '.gif';
  return '.webp';
}

export interface ValidatedUpload {
  mimeType: AllowedImageMime;
  originalName: string;
  sizeBytes: number;
}

export function validateUploadBuffer(
  buffer: Buffer,
  filename: string,
  declaredMimeType: string,
): ValidatedUpload {
  if (buffer.length === 0) {
    throw new UploadPolicyError('Empty files are not allowed', 'UPLOAD_EMPTY_FILE', 400);
  }
  if (buffer.length > env.MAX_FILE_SIZE) {
    throw new UploadPolicyError('File exceeds the configured size limit', 'UPLOAD_FILE_TOO_LARGE', 413);
  }

  const trimmedName = filename.trim();
  if (!trimmedName || trimmedName.length > 255 || /[\0-\x1f\x7f]/.test(trimmedName)) {
    throw new UploadPolicyError('Invalid filename', 'UPLOAD_INVALID_FILENAME', 400);
  }
  if (trimmedName !== path.basename(trimmedName) || /[\\/]/.test(trimmedName)) {
    throw new UploadPolicyError('Path components are not allowed in filenames', 'UPLOAD_INVALID_FILENAME', 400);
  }

  const normalizedDeclaredMime = declaredMimeType.trim().toLowerCase();
  const actualMime = detectAllowedImageMime(buffer);
  if (!actualMime || !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedDeclaredMime as AllowedImageMime)) {
    throw new UploadPolicyError('Unsupported image type', 'UPLOAD_INVALID_TYPE', 400);
  }
  if (actualMime !== normalizedDeclaredMime) {
    throw new UploadPolicyError('Declared MIME type does not match file content', 'UPLOAD_MIME_MISMATCH', 400);
  }

  const extension = path.extname(trimmedName).toLowerCase();
  if (!MIME_EXTENSIONS[actualMime].includes(extension)) {
    throw new UploadPolicyError('Filename extension does not match file content', 'UPLOAD_EXTENSION_MISMATCH', 400);
  }

  return { mimeType: actualMime, originalName: trimmedName, sizeBytes: buffer.length };
}
