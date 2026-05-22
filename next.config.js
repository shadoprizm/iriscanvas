/** @type {import('next').NextConfig} */
const nextConfig = {
  // No 'output: export' — API routes need server runtime
  // No custom distDir — Railway/Next expect .next default
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
