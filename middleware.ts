import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip middleware for API routes, static files, and login page
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check for Athena session cookie
  const sessionCookie = request.cookies.get('athena_session')
  
  if (!sessionCookie) {
    // No session found, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Validate session (basic check)
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    
    if (!session.accessToken || Date.now() > session.expiresAt) {
      // Session expired, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('athena_session')
      return response
    }

    // Add clinic context to request headers
    const response = NextResponse.next()
    response.headers.set('x-clinic-id', session.clinicId)
    response.headers.set('x-practice-id', session.practiceId)
    
    return response
  } catch (error) {
    // Invalid session, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('athena_session')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}