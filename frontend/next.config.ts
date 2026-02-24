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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.smartcon360.com https://accounts.google.com https://oauth2.googleapis.com",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
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
