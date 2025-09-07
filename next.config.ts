// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/COMP4537/labs/:id',  destination: '/COMP4537/labs/:id/index.html' },
      { source: '/COMP4537/labs/:id/', destination: '/COMP4537/labs/:id/index.html' },
    ];
  },
};

export default nextConfig;
