import type { NextConfig } from 'next';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  experimental: {},
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_GATEWAY_URL}/api/v1/:path*`,
      },
    ];
  },
};
export default nextConfig;
