/**
 * Sprint 7 — File Upload Security Hardening
 *
 * Invariants verified:
 *   1. Magic byte / MIME detection: header + footer strict checks
 *   2. MIME spoofing rejection (declared != actual)
 *   3. Polyglot detection: data appended after image EOF is rejected
 *   4. SVG and HTML files are unconditionally rejected
 *   5. Path traversal is rejected in filenames
 *   6. Null bytes and control characters in filenames are rejected
 *   7. Extension ↔ MIME mismatch is rejected
 *   8. Client-supplied storage keys are forbidden
 *   9. Quota enforcement is atomic (guarded UPDATE, not read-modify-write)
 *  10. Content serving headers: X-Content-Type-Options, Content-Disposition
 *  11. StorageService key format validation prevents path traversal in storage
 *  12. IDOR: product uploads require seller ownership
 *  13. Uploaded files cannot be served outside the /uploads directory
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1:3306/upload_unit_test';
process.env.JWT_ACCESS_SECRET ||= 'unit-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'unit-refresh-secret-that-is-at-least-32-characters';

// ---------------------------------------------------------------------------
// Minimal valid image buffers
// ---------------------------------------------------------------------------

// JPEG: SOI (FFD8FF) ... EOI (FFD9) — must end with FFD9
const validJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x14, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xd9, // EOI
]);

// PNG: 8-byte signature + minimal IEND chunk (last 12 bytes)
const validPng = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),   // PNG signature
  Buffer.alloc(25),                          // placeholder IHDR data
  Buffer.from('0000000049454e44ae426082', 'hex'), // IEND chunk
]);

// GIF89a: 6-byte header + minimal body + terminator (0x3b)
const validGif = Buffer.concat([
  Buffer.from('GIF89a', 'ascii'),
  Buffer.alloc(7),  // minimal screen descriptor
  Buffer.from([0x3b]), // GIF terminator
]);

// WebP: RIFF header + WEBP + VP8  chunk + body with length matching exactly
function buildValidWebp(): Buffer {
  const vp8Type = Buffer.from('VP8L', 'ascii');
  const chunkData = Buffer.alloc(4); // minimal VP8L payload
  const chunkLen = Buffer.allocUnsafe(4);
  chunkLen.writeUInt32LE(chunkData.length, 0);
  const inner = Buffer.concat([vp8Type, chunkLen, chunkData]);
  const riffLen = Buffer.allocUnsafe(4);
  // RIFF payload = 4 bytes WEBP + inner chunk
  riffLen.writeUInt32LE(4 + inner.length, 0);
  return Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    riffLen,
    Buffer.from('WEBP', 'ascii'),
    inner,
  ]);
}
const validWebp = buildValidWebp();

// ---------------------------------------------------------------------------
// 1. Magic byte detection — basic pass cases
// ---------------------------------------------------------------------------

test('[S7-1] detectAllowedImageMime identifies all four image types', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');

  assert.equal(detectAllowedImageMime(validJpeg), 'image/jpeg');
  assert.equal(detectAllowedImageMime(validPng), 'image/png');
  assert.equal(detectAllowedImageMime(validGif), 'image/gif');
  assert.equal(detectAllowedImageMime(validWebp), 'image/webp');
});

test('[S7-2] detectAllowedImageMime returns null for SVG, HTML, PDF, and random bytes', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');

  const svgFile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const htmlFile = Buffer.from('<!DOCTYPE html><html><body></body></html>');
  const pdfFile = Buffer.from('%PDF-1.4 fake content');
  const randomBytes = Buffer.from('zzzz random data that matches no format header');

  assert.equal(detectAllowedImageMime(svgFile), null, 'SVG must be rejected');
  assert.equal(detectAllowedImageMime(htmlFile), null, 'HTML must be rejected');
  assert.equal(detectAllowedImageMime(pdfFile), null, 'PDF must be rejected');
  assert.equal(detectAllowedImageMime(randomBytes), null, 'random bytes must be rejected');
});

// ---------------------------------------------------------------------------
// 2. Polyglot detection — data appended after EOF marker is rejected
// ---------------------------------------------------------------------------

test('[S7-3] JPEG polyglot: HTML appended after FFD9 EOI marker is rejected', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');

  // Append HTML content AFTER valid JPEG EOI — creates a JPEG polyglot
  const polyglotJpeg = Buffer.concat([
    validJpeg,
    Buffer.from('<script>alert("xss")</script>'),
  ]);
  // isJpeg checks buffer[last-2]=FF, buffer[last-1]=D9; appended data shifts the end
  assert.equal(
    detectAllowedImageMime(polyglotJpeg),
    null,
    'JPEG polyglot with appended HTML must be rejected',
  );
});

test('[S7-4] PNG polyglot: data appended after IEND chunk is rejected', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');

  // Append HTML content AFTER valid PNG IEND — creates a PNG polyglot
  const polyglotPng = Buffer.concat([
    validPng,
    Buffer.from('<script>alert("xss")</script>'),
  ]);
  // isPng checks buffer.subarray(-12) === IEND chunk; appended data shifts the suffix
  assert.equal(
    detectAllowedImageMime(polyglotPng),
    null,
    'PNG polyglot with data after IEND must be rejected',
  );
});

test('[S7-5] GIF polyglot: data appended after 0x3B terminator is rejected', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');

  const polyglotGif = Buffer.concat([
    validGif,
    Buffer.from('<script>alert("xss")</script>'),
  ]);
  // isGif checks buffer[buffer.length-1] === 0x3b; appended data changes the last byte
  assert.equal(
    detectAllowedImageMime(polyglotGif),
    null,
    'GIF polyglot with data after 0x3B terminator must be rejected',
  );
});

test('[S7-6] WebP polyglot: length mismatch from appended data is rejected', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');

  const polyglotWebp = Buffer.concat([
    validWebp,
    Buffer.from('<html>'),
  ]);
  // isWebp checks declaredRiffLength === buffer.length; appended data breaks equality
  assert.equal(
    detectAllowedImageMime(polyglotWebp),
    null,
    'WebP with declared RIFF length mismatch must be rejected',
  );
});

// ---------------------------------------------------------------------------
// 3. MIME spoofing — declared MIME does not match actual file content
// ---------------------------------------------------------------------------

test('[S7-7] MIME spoofing: JPEG file declared as image/png is rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  assert.throws(
    () => validateUploadBuffer(validJpeg, 'photo.png', 'image/png'),
    UploadPolicyError,
    'JPEG content with PNG declared MIME must be rejected',
  );
});

test('[S7-8] MIME spoofing: PNG file declared as image/jpeg is rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  assert.throws(
    () => validateUploadBuffer(validPng, 'photo.jpeg', 'image/jpeg'),
    UploadPolicyError,
    'PNG content with JPEG declared MIME must be rejected',
  );
});

test('[S7-9] MIME spoofing: SVG file declared as image/png is rejected at magic-byte check', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  const svgFile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.throws(
    () => validateUploadBuffer(svgFile, 'icon.png', 'image/png'),
    UploadPolicyError,
    'SVG with PNG declared MIME must be rejected',
  );
});

test('[S7-10] MIME spoofing: image/svg+xml is not in the allowed set and is rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  const svgFile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.throws(
    () => validateUploadBuffer(svgFile, 'icon.svg', 'image/svg+xml'),
    UploadPolicyError,
    'image/svg+xml must be rejected as an unsupported MIME type',
  );
});

// ---------------------------------------------------------------------------
// 4. Extension ↔ MIME mismatch
// ---------------------------------------------------------------------------

test('[S7-11] Extension mismatch: JPEG content with .png extension is rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  assert.throws(
    () => validateUploadBuffer(validJpeg, 'photo.png', 'image/jpeg'),
    UploadPolicyError,
    'JPEG content with .png extension must be rejected',
  );
});

test('[S7-12] Extension mismatch: PNG content with .jpg extension is rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  assert.throws(
    () => validateUploadBuffer(validPng, 'photo.jpg', 'image/png'),
    UploadPolicyError,
    'PNG content with .jpg extension must be rejected',
  );
});

// ---------------------------------------------------------------------------
// 5. Path traversal in filenames
// ---------------------------------------------------------------------------

test('[S7-13] Path traversal in filename is rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  const traversalNames = [
    '../etc/passwd.jpg',
    '..\\windows\\system32\\cmd.exe.jpg',
    'subdir/photo.jpg',
    '/etc/shadow.jpg',
  ];

  for (const name of traversalNames) {
    assert.throws(
      () => validateUploadBuffer(validJpeg, name, 'image/jpeg'),
      UploadPolicyError,
      `Path traversal in "${name}" must be rejected`,
    );
  }
});

test('[S7-14] Control characters and null bytes in filenames are rejected', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');

  const dangerousNames = [
    'photo\x00.jpg',       // null byte
    'photo\x1f.jpg',       // control char
    'photo\x7f.jpg',       // DEL
    '\x00.jpg',            // leading null
  ];

  for (const name of dangerousNames) {
    assert.throws(
      () => validateUploadBuffer(validJpeg, name, 'image/jpeg'),
      UploadPolicyError,
      `Control character in filename must be rejected`,
    );
  }
});

// ---------------------------------------------------------------------------
// 6. Storage key security — server-generated UUIDs, no client injection
// ---------------------------------------------------------------------------

test('[S7-15] Client-supplied key fields are forbidden in upload handler', () => {
  const handler = readFileSync('src/lib/upload/secure-upload-handler.ts', 'utf8');

  // All client-key fields must be in the blocklist
  assert.match(handler, /CLIENT_CONTROLLED_STORAGE_FIELDS/);
  assert.match(handler, /'key'.*'storageKey'.*'userId'.*'ownerId'|'key',\s*'storageKey',\s*'userId',\s*'ownerId'/s);

  // The handler must check for forbidden fields before accepting files
  const forbiddenCheckIndex = handler.indexOf('CLIENT_CONTROLLED_STORAGE_FIELDS');
  const formDataIndex = handler.indexOf('formData.getAll(');
  assert.ok(
    forbiddenCheckIndex < formDataIndex,
    'Forbidden client-key check must happen before file extraction',
  );
});

test('[S7-16] Storage keys are server-generated UUIDs from detected MIME extension', () => {
  const storage = readFileSync('src/lib/services/upload/storage.service.ts', 'utf8');

  assert.match(storage, /crypto\.randomUUID\(\)/);
  assert.match(storage, /canonicalExtensionForMime\(detectedMime\)/);
});

test('[S7-17] LocalStorageAdapter.resolveKey validates UUID key format and rejects traversal', async () => {
  // Use the private resolveKey behavior indirectly via delete() with an invalid key
  // to test that the storage layer rejects bad keys.
  const { StorageService } = await import('@/lib/services/upload/storage.service');

  const badKeys = [
    '../etc/passwd',
    '../../secret.jpg',
    '%2e%2ephoto.png',
    'subdir/photo.jpg',
    'photo.jpg',         // no UUID prefix
    'not-a-uuid.jpg',   // wrong format
    '123e4567-e89b-42d3-a456-426614174000.svg',  // valid UUID but disallowed ext
  ];

  for (const key of badKeys) {
    await assert.rejects(
      () => StorageService.delete(key),
      Error,
      `Invalid key "${key}" must be rejected by storage layer`,
    );
  }
});

// ---------------------------------------------------------------------------
// 7. Content serving security headers (middleware)
// ---------------------------------------------------------------------------

test('[S7-18] Middleware adds X-Content-Type-Options: nosniff to /uploads/* responses', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf8');

  // Must have the security header for uploads
  assert.match(middleware, /X-Content-Type-Options/);
  assert.match(middleware, /nosniff/);

  // Must be applied to the /uploads/ path
  assert.match(middleware, /pathname\.startsWith\(['"]\/uploads\//);
});

test('[S7-19] Middleware adds Content-Disposition: inline to /uploads/* responses', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf8');

  assert.match(middleware, /Content-Disposition/);
  assert.match(middleware, /'inline'/);
});

test('[S7-20] Middleware adds X-Frame-Options: SAMEORIGIN to /uploads/* responses', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf8');

  assert.match(middleware, /X-Frame-Options/);
  assert.match(middleware, /SAMEORIGIN/);
});

test('[S7-21] /uploads/ path is in middleware matcher config', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf8');

  assert.match(middleware, /uploads\/:path\*/);
});

test('[S7-22] Middleware derives Content-Type from file extension, not browser-supplied MIME', () => {
  const middleware = readFileSync('src/middleware.ts', 'utf8');

  // Must use a server-side extension-to-MIME map, not a client header
  assert.match(middleware, /UPLOAD_EXT_MIME/);
  assert.match(middleware, /pathname\.split\('\.'\)/);
  assert.doesNotMatch(middleware, /request\.headers\.get\(['"]content-type['"]\)/i);
});

// ---------------------------------------------------------------------------
// 8. IDOR — Product uploads require seller ownership
// ---------------------------------------------------------------------------

test('[S7-23] Product upload authorization rejects a different seller owning the product', async () => {
  const { authorizeUploadPurpose, UploadAssetAuthorizationError } = await import('@/lib/services/upload/upload-asset.service');

  const tx = {
    product: { findFirst: async () => ({ sellerId: 'seller-B' }) },
  };
  await assert.rejects(
    authorizeUploadPurpose(
      tx as never,
      { userId: 'seller-A', role: 'user', isSeller: true },
      'product',
      'product-belonging-to-B',
    ),
    UploadAssetAuthorizationError,
    'Upload for product owned by another seller must be rejected',
  );
});

test('[S7-24] Product upload authorization rejects non-seller users', async () => {
  const { authorizeUploadPurpose, UploadAssetAuthorizationError } = await import('@/lib/services/upload/upload-asset.service');

  const tx = {
    product: { findFirst: async () => null },
  };
  await assert.rejects(
    authorizeUploadPurpose(
      tx as never,
      { userId: 'user-X', role: 'user', isSeller: false },
      'product',
      undefined,
    ),
    UploadAssetAuthorizationError,
    'Non-seller attempting product upload must be rejected',
  );
});

test('[S7-25] Avatar upload authorization rejects a resource id (must be session-derived)', async () => {
  const { authorizeUploadPurpose, UploadAssetAuthorizationError } = await import('@/lib/services/upload/upload-asset.service');

  const tx = { product: { findFirst: async () => null } };
  await assert.rejects(
    authorizeUploadPurpose(
      tx as never,
      { userId: 'user-X', role: 'user', isSeller: false },
      'avatar',
      'some-resource-id',
    ),
    UploadAssetAuthorizationError,
    'Avatar upload with explicit resource id must be rejected',
  );
});

test('[S7-26] Admin role can upload for any product regardless of sellerId', async () => {
  const { authorizeUploadPurpose } = await import('@/lib/services/upload/upload-asset.service');

  const tx = {
    product: { findFirst: async () => ({ sellerId: 'seller-B' }) },
  };
  // Admin should not throw
  await assert.doesNotReject(
    () => authorizeUploadPurpose(
      tx as never,
      { userId: 'admin-user', role: 'admin', isSeller: false },
      'product',
      'any-product-id',
    ),
    'Admin must be able to upload for any product',
  );
});

// ---------------------------------------------------------------------------
// 9. Quota — atomic guarded UPDATE semantics
// ---------------------------------------------------------------------------

test('[S7-27] Quota service uses atomic guarded UPDATE to enforce limits', () => {
  const quota = readFileSync('src/lib/services/upload/upload-quota.service.ts', 'utf8');

  // Must use guarded UPDATE with capacity guards in the WHERE clause
  assert.match(quota, /UPDATE upload_quota_bucket/);
  assert.match(quota, /fileCount <= .* - .*/);
  assert.match(quota, /bytesUsed <= .* - .*/);
  // Affected rows must be checked — not a read-modify-write
  assert.match(quota, /affected !== 1/);
});

test('[S7-28] Quota reservation and release are wrapped in DB transactions', () => {
  const quota = readFileSync('src/lib/services/upload/upload-quota.service.ts', 'utf8');

  const txCount = (quota.match(/prisma\.\$transaction/g) ?? []).length;
  assert.ok(txCount >= 2, `Expected at least 2 prisma transactions, found ${txCount}`);
});

test('[S7-29] Quota release uses GREATEST(0, ...) to prevent negative counts', () => {
  const quota = readFileSync('src/lib/services/upload/upload-quota.service.ts', 'utf8');

  assert.match(quota, /GREATEST\(0, fileCount - /);
  assert.match(quota, /GREATEST\(0, bytesUsed - /);
});

// ---------------------------------------------------------------------------
// 10. Upload-asset claim guards (IDOR at DB level)
// ---------------------------------------------------------------------------

test('[S7-30] Avatar claim requires userId match in WHERE clause', () => {
  const asset = readFileSync('src/lib/services/upload/upload-asset.service.ts', 'utf8');

  // claimAvatarUpload must include userId in the WHERE to prevent IDOR
  assert.match(asset, /claimAvatarUpload[\s\S]*?userId,\s*url,\s*purpose:/);
});

test('[S7-31] Product image claim requires userId and URL match in WHERE clause', () => {
  const asset = readFileSync('src/lib/services/upload/upload-asset.service.ts', 'utf8');

  assert.match(asset, /claimProductUploads[\s\S]*?userId,\s*url,\s*purpose:/);
});

// ---------------------------------------------------------------------------
// 11. Authentication gate — must precede file parsing
// ---------------------------------------------------------------------------

test('[S7-32] Upload handler requires authentication before any multipart body parsing', () => {
  const handler = readFileSync('src/lib/upload/secure-upload-handler.ts', 'utf8');

  const authIndex = handler.indexOf('await getSession()');
  const formDataIndex = handler.indexOf('await req.formData()');

  assert.ok(authIndex >= 0, 'getSession() call must exist');
  assert.ok(formDataIndex >= 0, 'req.formData() call must exist');
  assert.ok(
    authIndex < formDataIndex,
    'Authentication check must precede multipart form parsing',
  );
  assert.match(handler, /AUTHENTICATION_REQUIRED/);
});

// ---------------------------------------------------------------------------
// 12. StorageService.validateFile is defense-in-depth using strict detector
// ---------------------------------------------------------------------------

test('[S7-33] StorageService.validateFile uses the strict header+footer magic-byte detector', () => {
  const storage = readFileSync('src/lib/services/upload/storage.service.ts', 'utf8');

  // Must use detectAllowedImageMime (which checks both header and footer)
  assert.match(storage, /detectAllowedImageMime\(file\) === mimeType/);

  // Must NOT have the old weaker header-only signatures lookup
  assert.doesNotMatch(
    storage,
    /const signatures: Record/,
    'Weak header-only signature table must be removed',
  );
});

test('[S7-34] StorageService.validateFile returns false for polyglot JPEG', async () => {
  const { StorageService } = await import('@/lib/services/upload/storage.service');

  const polyglot = Buffer.concat([validJpeg, Buffer.from('<script>alert(1)</script>')]);
  const result = await StorageService.validateFile(polyglot, 'image/jpeg');
  assert.equal(result, false, 'Polyglot JPEG must fail StorageService.validateFile');
});

test('[S7-35] StorageService.validateFile returns true for valid JPEG/PNG', async () => {
  const { StorageService } = await import('@/lib/services/upload/storage.service');

  assert.equal(await StorageService.validateFile(validJpeg, 'image/jpeg'), true);
  assert.equal(await StorageService.validateFile(validPng, 'image/png'), true);
});

// ---------------------------------------------------------------------------
// 13. Allowed image source list prevents XSS via unsafe origins
// ---------------------------------------------------------------------------

test('[S7-36] Image source allowlist rejects svg, javascript:, and data: URIs', () => {
  const { isAllowedImageSource } = require('@/lib/upload/image-source');

  assert.equal(isAllowedImageSource('javascript:alert(1)'), false);
  assert.equal(isAllowedImageSource('data:image/svg+xml;base64,abc'), false);
  assert.equal(isAllowedImageSource('/uploads/file.svg'), false, 'SVG extension in uploads must be rejected');
  assert.equal(isAllowedImageSource('//evil.com/photo.png'), false);
  assert.equal(isAllowedImageSource('http://res.cloudinary.com/x/image/upload/test.png', 'x'), false, 'HTTP Cloudinary must be rejected');
});
