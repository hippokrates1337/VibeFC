import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Debug information
  console.log(`[Middleware] Path: ${req.nextUrl.pathname}`);
  
  // Skip middleware for API routes and static files
  if (req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    console.log(`[Middleware] Skipping middleware for ${req.nextUrl.pathname}`);
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
  
  // Define public and protected routes
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password', '/landing'];
  // Check if the current path starts with any of the public routes
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname === route || 
    req.nextUrl.pathname.startsWith(`${route}/`)
  );
  console.log(`[Middleware] Is public route: ${isPublicRoute}`);
  
  // Get the auth token from cookies
  const token = req.cookies.get('sb-access-token')?.value;
  let isAuthenticated = false;
  
  // Supabase setup for auth verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    // Allow the request to proceed but log the error
    return res;
  }
  
  if (token) {
    try {
      // Verify the session
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.getUser(token);
      isAuthenticated = !error && !!data.user;
      console.log(`[Middleware] Authentication check result: ${isAuthenticated}`);
    } catch (error) {
      console.error('Auth verification error:', error);
      isAuthenticated = false;
    }
  } else {
    console.log('[Middleware] No token found in cookies');
  }
  
  // If the user is not authenticated and tries to access any non-public route, redirect to landing page
  if (!isAuthenticated && !isPublicRoute) {
    console.log(`[Middleware] Redirecting unauthenticated user to landing page from ${req.nextUrl.pathname}`);
    const landingUrl = new URL('/landing', req.url);
    
    // Increment redirect count
    const response = NextResponse.redirect(landingUrl);
    response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    return response;
  }
  
  // If the user is authenticated and tries to access auth routes (login/signup),
  // redirect them to the homepage
  if (isAuthenticated && isPublicRoute) {
    console.log(`[Middleware] Redirecting authenticated user to homepage from ${req.nextUrl.pathname}`);
    // Increment redirect count
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    return response;
  }
  
  // For normal navigation, reset the counter
  console.log(`[Middleware] Normal navigation for ${req.nextUrl.pathname}`);
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