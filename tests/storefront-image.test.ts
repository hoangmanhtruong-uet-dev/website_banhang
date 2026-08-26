import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isAllowedImageSource,
  resolveAllowedImageSource,
} from '../src/lib/image-source';

test('image sources allow known static, generated upload, object preview and configured Cloudinary only', () => {
  const cloudName = 'store-account';

  assert.equal(isAllowedImageSource('/images/products/category-home.webp', cloudName), true);
  assert.equal(isAllowedImageSource('/uploads/123e4567-e89b-42d3-a456-426614174000.webp', cloudName), true);
  assert.equal(isAllowedImageSource('/uploads/1779520603839-tai-xuong.jpg', cloudName), true);
  assert.equal(isAllowedImageSource('blob:https://store.test/id', cloudName), true);
  assert.equal(
    isAllowedImageSource(
      'https://res.cloudinary.com/store-account/image/upload/v1/products/photo.webp',
      cloudName,
    ),
    true,
  );
  assert.equal(isAllowedImageSource('//attacker.test/photo.webp', cloudName), false);
  assert.equal(isAllowedImageSource('http://res.cloudinary.com/store-account/image/upload/x', cloudName), false);
  assert.equal(isAllowedImageSource('https://res.cloudinary.com/other/image/upload/x', cloudName), false);
  assert.equal(isAllowedImageSource('https://trusted.test.attacker.test/photo.webp', cloudName), false);
});

test('local image sources reject routes, malformed upload keys and URL ambiguity', () => {
  const rejected = [
    '/api/private/avatar',
    '/uploads/photo.webp',
    '/uploads/177952060383-photo.jpg',
    '/uploads/1779520603839-../photo.jpg',
    '/uploads/1779520603839-photo.jpg?token=secret',
    '/uploads/1779520603839-%2e%2e.jpg',
    '/uploads/123e4567-e89b-42d3-a456-426614174000.svg',
    '/images/../secret.webp',
    '/images/%2e%2e/secret.webp',
    '/images\\products\\category-home.webp',
    '/images/products/category-home.webp?token=secret',
    '/images/products/category-home.webp#fragment',
    '/images/products/category-home.webp\n',
    '//attacker.test/photo.webp',
  ];

  for (const source of rejected) assert.equal(isAllowedImageSource(source), false, source);
});

test('invalid or empty image source resolves to a safe fallback', () => {
  assert.equal(
    resolveAllowedImageSource('https://attacker.test/image.png', '/images/products/category-home.webp', 'store-account'),
    '/images/products/category-home.webp',
  );
  assert.equal(
    resolveAllowedImageSource(' /images/products/category-home.webp', undefined, 'store-account'),
    undefined,
  );
  assert.equal(resolveAllowedImageSource('', undefined, 'store-account'), undefined);
});

test('Next image loader uses an exact Cloudinary hostname and account path', () => {
  const config = readFileSync('next.config.js', 'utf8');

  assert.match(config, /hostname: 'res\.cloudinary\.com'/);
  assert.match(config, /NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudinaryCloudName \|\| ''/);
  assert.match(config, /cloudinaryCloudName \+ '\/image\/upload\/\*\*'/);
  assert.doesNotMatch(config, /hostname:\s*'\*\*'|unoptimized:\s*true/);
});
