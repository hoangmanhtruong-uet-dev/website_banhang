import type { Prisma } from '@prisma/client';

export const MAX_PRODUCT_IMAGES = 10;

export class UploadAssetAuthorizationError extends Error {
  readonly code = 'UPLOAD_ASSET_FORBIDDEN';
  readonly status = 403;

  constructor(message = 'Upload asset is not owned by the authenticated user') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UploadAssetValidationError extends Error {
  readonly code = 'UPLOAD_ASSET_INVALID';
  readonly status = 400;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function normalizeProductImageUrls(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new UploadAssetValidationError('Product images must be an array');
  if (value.some((url) => typeof url !== 'string' || !url.trim())) {
    throw new UploadAssetValidationError('Every product image must be a non-empty URL');
  }
  const unique = [...new Set((value as string[]).map((url) => url.trim()))];
  if (unique.length > MAX_PRODUCT_IMAGES) {
    throw new UploadAssetValidationError(`A product can have at most ${MAX_PRODUCT_IMAGES} images`);
  }
  return unique;
}

export async function claimAvatarUpload(
  tx: Prisma.TransactionClient,
  userId: string,
  url: string,
): Promise<void> {
  const claimed = await tx.uploadAsset.updateMany({
    where: {
      userId,
      url,
      purpose: 'avatar',
      OR: [
        { status: 'AVAILABLE', resourceId: null },
        { status: 'ATTACHED', resourceId: userId },
      ],
    },
    data: { status: 'ATTACHED', resourceId: userId },
  });
  if (claimed.count !== 1) throw new UploadAssetAuthorizationError();
}

export async function claimProductUploads(
  tx: Prisma.TransactionClient,
  userId: string,
  productId: string,
  urls: readonly string[],
  existingUrls: ReadonlySet<string> = new Set(),
): Promise<void> {
  for (const url of urls) {
    if (existingUrls.has(url)) continue;
    const claimed = await tx.uploadAsset.updateMany({
      where: {
        userId,
        url,
        purpose: 'product',
        OR: [
          { status: 'AVAILABLE', resourceId: null },
          { status: 'AVAILABLE', resourceId: productId },
          { status: 'ATTACHED', resourceId: productId },
        ],
      },
      data: { status: 'ATTACHED', resourceId: productId },
    });
    if (claimed.count !== 1) throw new UploadAssetAuthorizationError();
  }
}

export interface UploadActor {
  userId: string;
  role: string;
  isSeller: boolean;
}

export async function authorizeUploadPurpose(
  tx: Prisma.TransactionClient,
  actor: UploadActor,
  purpose: 'avatar' | 'product',
  resourceId?: string,
): Promise<void> {
  if (purpose === 'avatar') {
    if (resourceId) throw new UploadAssetAuthorizationError('Avatar resource id is derived from the session');
    return;
  }

  if (!actor.isSeller && actor.role !== 'admin') {
    throw new UploadAssetAuthorizationError('Seller access is required for product uploads');
  }
  if (!resourceId) return;

  const product = await tx.product.findFirst({
    where: { id: resourceId, deletedAt: null },
    select: { sellerId: true },
  });
  if (!product || (actor.role !== 'admin' && product.sellerId !== actor.userId)) {
    throw new UploadAssetAuthorizationError('Product does not belong to the authenticated seller');
  }
}
