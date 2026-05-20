/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'export' — need server runtime for /api/generate
  distDir: 'web',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
