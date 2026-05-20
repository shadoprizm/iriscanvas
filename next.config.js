/** @type {import('next').NextConfig} */
const nextConfig = {
  // No 'output: export' — API routes need server runtime
  // No custom distDir — Vercel expects .next default
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
