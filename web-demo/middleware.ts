import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ['/', '/test'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/test');

  // Allow public routes and test routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Public routes for auth
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(pathname);

  // If accessing auth route and already logged in, redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If accessing protected route and not logged in, redirect to login
  if (!isAuthRoute && !token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/', '/test', '/api/test/:path*'],
};

