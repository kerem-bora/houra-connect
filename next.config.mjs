/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build sırasında hata almanı önlemek için eklediklerin
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Eksik paket hatalarını (pino, metamask-sdk vb.) susturan bölüm
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pino-pretty": false,
        "fsevents": false,
        "@react-native-async-storage/async-storage": false,
      };
    }
    return config;
  },
};

export default nextConfig;