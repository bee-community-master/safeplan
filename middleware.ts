import { NextRequest, NextResponse } from 'next/server';

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const webhookPaths = new Set(['/api/payments/webhook']);
const buckets = new Map<string, { count: number; resetAt: number }>();

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const expected = request.nextUrl.origin;
  if (origin) return origin === expected;
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }
  return process.env.APP_ENV !== 'production';
}

function rateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const route = request.nextUrl.pathname.replace(/\/[A-Za-z0-9_-]{12,}/g, '/:id');
  const key = `${ip}:${request.method}:${route}`;
  const now = Date.now();
  const windowMs = 60_000;
  const max = route.includes('/uploads') || route.includes('/jobs/process') ? 20 : 90;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count > max) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }, { status: 429 });
  }
  return null;
}

function contentSecurityPolicy(): string {
  const scriptSrc = process.env.APP_ENV === 'production'
    ? "'self' 'unsafe-inline' https://js.tosspayments.com"
    : "'self' 'unsafe-inline' 'unsafe-eval' https://js.tosspayments.com";
  return `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('Content-Security-Policy', contentSecurityPolicy());
  return response;
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const limited = rateLimit(request);
    if (limited) return withSecurityHeaders(limited);

    if (mutatingMethods.has(request.method) && !webhookPaths.has(request.nextUrl.pathname) && !isSameOrigin(request)) {
      return withSecurityHeaders(NextResponse.json({ error: '잘못된 요청 출처입니다.' }, { status: 403 }));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
