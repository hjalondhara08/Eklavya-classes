import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role;
    const path = req.nextUrl.pathname;

    // Admin-only pages and APIs
    const isAdminPage =
      path.startsWith('/expenses') ||
      path.startsWith('/reports') ||
      path.startsWith('/users') ||
      path.startsWith('/api/expenses') ||
      path.startsWith('/api/reports') ||
      path.startsWith('/api/users');

    if (isAdminPage && role !== 'admin') {
      if (path.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Access denied. Admins only.' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

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
