import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Essential debug information only
  console.log(`[Middleware] ${req.method} ${req.nextUrl.pathname}`);
  
  // Skip middleware for API routes and static files
  if (req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    return res;
  }

  // Check if we're in a redirect loop by checking the redirect count
  const redirectCount = parseInt(req.cookies.get('redirect_count')?.value || '0');
  console.log(`[Middleware] Redirect count: ${redirectCount}`);
  if (redirectCount > 5) {
    // Reset the counter and break the loop
    console.log(`[Middleware] Breaking redirect loop`);
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
  console.log(`[Middleware] Is public route: ${isPublicRoute}`);
  
  // Get the auth token from cookies - Supabase uses a dynamic cookie name
  let authCookie: string | undefined;
  
  // Debug: List all cookies
  const allCookies = req.cookies.getAll();
  console.log(`[Middleware] All cookies:`, allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
  
  // Find the Supabase auth cookie
  const supabaseCookie = allCookies.find(cookie => 
    (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) ||
    cookie.name === 'sb-access-token'
  );
  
  console.log(`[Middleware] Supabase cookie search result:`, {
    found: !!supabaseCookie,
    cookieName: supabaseCookie?.name,
    hasValue: !!supabaseCookie?.value,
    searchPattern: 'sb-*-auth-token OR sb-access-token'
  });
  
  authCookie = supabaseCookie?.value;
  
  let isAuthenticated = false;
  
  // Supabase setup for auth verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    // For protected routes, redirect to root if no env vars
    if (!isPublicRoute && req.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return res;
  }
  
  if (authCookie) {
    try {
      let accessToken: string | undefined;
      
      // Handle both JWT tokens and JSON session objects
      if (authCookie.startsWith('eyJ')) {
        // This is a raw JWT token (starts with 'eyJ' which is base64 for '{"')
        console.log('[Middleware] Found raw JWT token in cookie');
        accessToken = authCookie;
      } else {
        // This is a JSON session object
        console.log('[Middleware] Found JSON session object in cookie');
        const sessionData = JSON.parse(authCookie);
        accessToken = sessionData?.access_token;
      }
      
      if (accessToken) {
        // Verify the session
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.auth.getUser(accessToken);
        isAuthenticated = !error && !!data.user;
        console.log(`[Middleware] Authentication check result: ${isAuthenticated}`);
        if (error) {
          console.log(`[Middleware] Auth verification error:`, error.message);
        }
      } else {
        console.log('[Middleware] No access token found in cookie');
      }
    } catch (error) {
      console.error('Auth cookie parsing error:', error);
      isAuthenticated = false;
    }
  } else {
    console.log('[Middleware] No Supabase auth cookie found');
  }
  
  // If the user is not authenticated and tries to access any protected route, allow root but redirect others
  if (!isAuthenticated && !isPublicRoute && req.nextUrl.pathname !== '/') {
    console.log(`[Middleware] Redirecting unauthenticated user to root from ${req.nextUrl.pathname}`);
    const rootUrl = new URL('/', req.url);
    
    // Increment redirect count
    const response = NextResponse.redirect(rootUrl);
    response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    return response;
  }
  
  // If the user is authenticated and tries to access auth routes (login/signup),
  // redirect them to the root
  if (isAuthenticated && isPublicRoute) {
    console.log(`[Middleware] Redirecting authenticated user to root from ${req.nextUrl.pathname}`);
    // Increment redirect count
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    return response;
  }

  // For normal navigation, reset the counter
  console.log(`[Middleware] Normal navigation for ${req.nextUrl.pathname}`);
  const normalResponse = NextResponse.next();
  normalResponse.cookies.set('redirect_count', '0', { path: '/' });
  
  console.log(`[Middleware] COMPLETED - Normal navigation`);
  return normalResponse;
}

export const config = {
  matcher: [
    // Skip middleware for internal Next.js paths like _next/static,
    // public files, and api calls
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public).*)',
  ],
}; 