/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Transpile workspace packages when added (packages/ui, packages/core, etc.)
  transpilePackages: [],
};

export default nextConfig;
