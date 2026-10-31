import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { evaluateAuthRedirect, isPublicPath } from '@/lib/auth/redirect-policy';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Skip middleware for API routes and static files
  if (req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    return res;
  }

  const isPublicRoute = isPublicPath(req.nextUrl.pathname);
  // Get the auth token from cookies - Supabase uses a dynamic cookie name
  let authCookie: string | undefined;

  const allCookies = req.cookies.getAll();

  // Find the Supabase auth cookie
  const supabaseCookie = allCookies.find(cookie => 
    (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) ||
    cookie.name === 'sb-access-token'
  );

  authCookie = supabaseCookie?.value;
  
  let isAuthenticated = false;
  
  // Supabase setup for auth verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error('middleware.missing-supabase-env');
    if (!isPublicRoute && req.nextUrl.pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }
  
  if (authCookie) {
    try {
      let accessToken: string | undefined;
      
      // Handle both JWT tokens and JSON session objects
      if (authCookie.startsWith('eyJ')) {
        accessToken = authCookie;
      } else {
        const sessionData = JSON.parse(authCookie);
        accessToken = sessionData?.access_token;
      }
      
      if (accessToken) {
        // Verify the session
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.auth.getUser(accessToken);
        isAuthenticated = !error && !!data.user;
        if (error) {
          logger.warn('middleware.auth-check-failed', { reason: error.message });
        }
      }
    } catch (error) {
      logger.error('middleware.auth-cookie-parse-failed', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      isAuthenticated = false;
    }
  }

  const redirectEvaluation = evaluateAuthRedirect({
    isAuthenticated,
    isPublicRoute,
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.search,
    returnTo: req.nextUrl.searchParams.get('returnTo'),
  });
  // The policy cannot loop: unauthenticated users land on a public route and
  // authenticated users on '/', which is not public. So no redirect counter is needed
  // (a client-controlled counter cookie previously allowed skipping this check).
  if (redirectEvaluation.type === 'redirect' && redirectEvaluation.destination) {
    return NextResponse.redirect(new URL(redirectEvaluation.destination, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    // Skip middleware for internal Next.js paths like _next/static,
    // public files, and api calls
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public).*)',
  ],
}; 