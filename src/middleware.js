import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production-12345'
);

// Public paths that do not require authentication
const publicPaths = ['/login', '/api/auth/telegram', '/api/telegram/webhook'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Exclude static assets and API routes if they are public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  
  // Protect all other routes
  if (!sessionCookie) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT token
  try {
    const { payload } = await jwtVerify(sessionCookie, SECRET_KEY);
    
    // Add user info to headers for API routes to consume
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.id);
    requestHeaders.set('x-user-telegram-id', payload.telegramId);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Invalid token
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
