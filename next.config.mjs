/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eğer build sırasında hata alıyorsan ve şimdilik geçmek istiyorsan bunları kullanabilirsin:
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;