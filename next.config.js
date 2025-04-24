/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force Next.js to use SWC compiler even when Babel config is present
  swcMinify: true,
  experimental: {
    forceSwcTransforms: true,
  },
}

module.exports = nextConfig 