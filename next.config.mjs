/** @type {import('next').NextConfig} */

headers: async () => [{
  source: "/(.*)",
  headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ]
}]

const nextConfig = {
  typescript: {
  
    ignoreBuildErrors: true,
  },
  eslint: {
 
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;