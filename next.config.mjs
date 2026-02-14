/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Build sırasında TS hatalarını görmezden gelir
    ignoreBuildErrors: true,
  },
  eslint: {
    // Build sırasında ESLint hatalarını görmezden gelir
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;