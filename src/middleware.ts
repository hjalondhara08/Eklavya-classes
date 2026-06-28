import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // On Vercel/HTTPS the session cookie is `__Secure-next-auth.session-token`.
  // Detect HTTPS robustly (don't rely on NEXTAUTH_URL being set) so getToken
  // looks for the correct, secure-prefixed cookie name — otherwise it can't see
  // a valid session and bounces every request back to /login.
  const isHttps =
    req.nextUrl.protocol === 'https:' ||
    req.headers.get('x-forwarded-proto') === 'https';

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isHttps,
  });

  // Not logged in → send to the login page (preserving where they were going).
  if (!token) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token as any).role;

  // Admin-only pages and APIs
  const isAdminArea =
    path.startsWith('/expenses') ||
    path.startsWith('/reports') ||
    path.startsWith('/users') ||
    path.startsWith('/api/expenses') ||
    path.startsWith('/api/reports') ||
    path.startsWith('/api/users');

  if (isAdminArea && role !== 'admin') {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/students/:path*',
    '/fees/:path*',
    '/expenses/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/api/students/:path*',
    '/api/fees/:path*',
    '/api/expenses/:path*',
    '/api/reports/:path*',
    '/api/users/:path*',
  ],
};
