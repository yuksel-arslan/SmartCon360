import type { NextConfig } from 'next';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    // Use 'fallback' so that App Router API routes (e.g. /api/v1/projects/[id]/wbs/generate)
    // are served by Next.js first. Only unmatched routes fall through to the API Gateway.
    return {
      fallback: [
        {
          source: '/api/v1/:path*',
          destination: `${API_GATEWAY_URL}/api/v1/:path*`,
        },
      ],
    };
  },
};
export default nextConfig;
