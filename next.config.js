/** @type {import('next').NextConfig} */
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const cloudinaryRemotePatterns = cloudinaryCloudName && /^[a-zA-Z0-9_-]+$/.test(cloudinaryCloudName)
  ? [{
      protocol: 'https',
      hostname: 'res.cloudinary.com',
      port: '',
      pathname: '/' + cloudinaryCloudName + '/image/upload/**',
    }]
  : [];

const nextConfig = {
  // Standard Next.js server configuration for Render
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudinaryCloudName || '',
  },
  images: {
    remotePatterns: cloudinaryRemotePatterns,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ],
      },
    ];
  },
};

module.exports = nextConfig;
