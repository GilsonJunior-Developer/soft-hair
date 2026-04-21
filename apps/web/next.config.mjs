/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile workspace packages
  transpilePackages: ['@softhair/db'],
};

export default nextConfig;
