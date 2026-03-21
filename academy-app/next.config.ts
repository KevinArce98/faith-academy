import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:
          'pub-fff9a5c3c6b2451fa422ef294bb09d10.r2.dev',
      },
    ],
  },
};

export default nextConfig;
