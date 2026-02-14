import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware: Redirect all *.vercel.app preview URLs to the production domain.
 *
 * Problem: Vercel generates a unique URL per deployment (e.g. smartcon360-abc123.vercel.app).
 * Google OAuth only works with pre-registered origins, so these dynamic URLs break sign-in.
 *
 * Solution: Permanent redirect (301) from any *.vercel.app host to the production domain.
 */

const PRODUCTION_DOMAIN = 'app.smartcon360.com';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Never redirect API routes — redirects break POST requests
  // (browsers convert POST→GET on 301/302 and strip Authorization headers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Redirect *.vercel.app → production domain (page routes only)
  // Skip if already on the production domain or localhost (dev)
  if (
    host.endsWith('.vercel.app') &&
    host !== PRODUCTION_DOMAIN
  ) {
    const url = request.nextUrl.clone();
    url.host = PRODUCTION_DOMAIN;
    url.protocol = 'https';
    url.port = '';

    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

// Run on all routes except static assets and API internals
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
