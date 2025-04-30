import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['ethereum-identity-kit'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
};


export default nextConfig;
