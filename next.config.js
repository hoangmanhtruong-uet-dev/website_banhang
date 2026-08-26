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
};

module.exports = nextConfig;
