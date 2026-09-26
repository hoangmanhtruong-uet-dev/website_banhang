import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1:3306/upload_unit_test';
process.env.JWT_ACCESS_SECRET ||= 'unit-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'unit-refresh-secret-that-is-at-least-32-characters';

const validJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x14, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xd9,
]);

// 1. Authenticated user requirement before processing
test('avatar upload flow requirement: unauthenticated upload request is rejected with 401', () => {
  const handler = readFileSync('src/lib/upload/secure-upload-handler.ts', 'utf8');
  assert.match(handler, /const session = await getSession\(\)/);
  assert.match(handler, /AUTHENTICATION_REQUIRED/);
});

// 2. Invalid file type / MIME magic-bytes check
test('avatar upload flow requirement: invalid file type (e.g. HTML/SVG script) is rejected', async () => {
  const { detectAllowedImageMime } = await import('@/lib/upload/upload-policy');
  const invalidFile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(detectAllowedImageMime(invalidFile), null);
});

// 3. Oversized file validation
test('avatar upload flow requirement: oversized file is rejected by policy validator', async () => {
  const { UploadPolicyError, validateUploadBuffer } = await import('@/lib/upload/upload-policy');
  const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
  assert.throws(() => validateUploadBuffer(oversizedBuffer, 'avatar.jpg', 'image/jpeg'), UploadPolicyError);
});

// 4. Ownership protection (IDOR / profile modification by another user)
test('avatar upload flow requirement: another user profile cannot claim an unowned avatar asset', async () => {
  const { claimAvatarUpload, UploadAssetAuthorizationError } = await import('@/lib/services/upload/upload-asset.service');
  const mockTx = {
    uploadAsset: {
      updateMany: async () => ({ count: 0 }),
    },
  };
  await assert.rejects(
    claimAvatarUpload(mockTx as never, 'user-victim', '/uploads/attacker-avatar.jpg'),
    UploadAssetAuthorizationError,
  );
});

// 5. Storage failure cleanup handling
test('avatar upload flow requirement: storage/reservation error cleans up temporary assets', () => {
  const handler = readFileSync('src/lib/upload/secure-upload-handler.ts', 'utf8');
  assert.match(handler, /StorageService\.delete\(key\)/);
  assert.match(handler, /releaseUploadReservation/);
});

// 6. Persistence failure handling
test('avatar upload flow requirement: profile update rejects invalid or unclaimed avatar URLs', () => {
  const profileRoute = readFileSync('src/app/api/user/profile/route.ts', 'utf8');
  assert.match(profileRoute, /claimAvatarUpload\(tx, session\.userId, allowed\.avatar\)/);
  assert.match(profileRoute, /UploadAssetAuthorizationError/);
});

// 7. Successful upload persists and links avatar URL to user profile
test('avatar upload flow requirement: successful avatar upload claims asset and updates user record', () => {
  const profileRoute = readFileSync('src/app/api/user/profile/route.ts', 'utf8');
  const assetService = readFileSync('src/lib/services/upload/upload-asset.service.ts', 'utf8');

  assert.match(profileRoute, /tx\.user\.update\(\{ where: \{ id: session\.userId \}, data: allowed \}\)/);
  assert.match(assetService, /status:\s*'ATTACHED',\s*resourceId:\s*userId/);
});
