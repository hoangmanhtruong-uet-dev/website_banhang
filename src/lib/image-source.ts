const STATIC_IMAGE_PATH =
  /^\/images\/(?:[a-z0-9_-]+\/)*[a-z0-9][a-z0-9._-]*\.(?:avif|gif|jpe?g|png|webp)$/i;
const LOCAL_UPLOAD_PATH =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:gif|jpe?g|png|webp)$/i;
// Read-only compatibility for uploads created before storage keys switched to
// UUIDs. New writes remain UUID-only in StorageService; this pattern accepts a
// single safe basename and cannot traverse out of /uploads.
const LEGACY_LOCAL_UPLOAD_PATH =
  /^\/uploads\/\d{13}-[^/\\%\x00-\x1f\x7f?#]{1,200}\.(?:gif|jpe?g|png|webp)$/iu;

const isAllowedLocalImageSource = (source: string) =>
  STATIC_IMAGE_PATH.test(source) || LOCAL_UPLOAD_PATH.test(source) || LEGACY_LOCAL_UPLOAD_PATH.test(source);

export function isAllowedImageSource(
  source: string,
  cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
): boolean {
  if (source.startsWith('blob:')) return true;
  if (isAllowedLocalImageSource(source)) return true;

  if (!cloudinaryCloudName) return false;

  try {
    const url = new URL(source);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.port === '' &&
      url.search === '' &&
      url.hash === '' &&
      url.pathname.startsWith('/' + cloudinaryCloudName + '/image/upload/')
    );
  } catch {
    return false;
  }
}

export function resolveAllowedImageSource(
  source: string | null | undefined,
  fallbackSource?: string,
  cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
): string | undefined {
  const requested = source;
  if (requested && isAllowedImageSource(requested, cloudinaryCloudName)) {
    return requested;
  }

  const fallback = fallbackSource;
  return fallback && isAllowedImageSource(fallback, cloudinaryCloudName)
    ? fallback
    : undefined;
}
