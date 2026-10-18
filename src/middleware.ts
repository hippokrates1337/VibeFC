import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { evaluateAuthRedirect } from '@/lib/auth/redirect-policy';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Skip middleware for API routes and static files
  if (req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    return res;
  }

  // Check if we're in a redirect loop by checking the redirect count
  const redirectCount = parseInt(req.cookies.get('redirect_count')?.value || '0');
  if (redirectCount > 5) {
    // Reset the counter and break the loop
    logger.warn('middleware.redirect-loop-prevented', {
      path: req.nextUrl.pathname,
    });
    const response = NextResponse.next();
    response.cookies.set('redirect_count', '0', { path: '/' });
    return response;
  }

  // Define public routes (removed /landing)
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password'];
  // Check if the current path starts with any of the public routes
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname === route || 
    req.nextUrl.pathname.startsWith(`${route}/`)
  );
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
  });
  if (redirectEvaluation.type === 'redirect' && redirectEvaluation.destination) {
    const response = NextResponse.redirect(new URL(redirectEvaluation.destination, req.url));
    if (redirectEvaluation.incrementRedirectCount) {
      response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    }
    return response;
  }

  const normalResponse = NextResponse.next();
  normalResponse.cookies.set('redirect_count', '0', { path: '/' });
  return normalResponse;
}

export const config = {
  matcher: [
    // Skip middleware for internal Next.js paths like _next/static,
    // public files, and api calls
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public).*)',
  ],
}; 