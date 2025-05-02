import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const response = NextResponse.next();
    response.cookies.set('redirect_count', '0', { path: '/' });
    return response;
  }
  
  // Define public and protected routes
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);
  
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
    } catch (error) {
      console.error('Auth verification error:', error);
      isAuthenticated = false;
    }
  }
  
  // If the user is not authenticated and tries to access any non-public route, redirect to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    // Add a 'from' param to redirect back after login if needed
    loginUrl.searchParams.set('from', req.nextUrl.pathname);
    
    // Increment redirect count
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    return response;
  }
  
  // If the user is authenticated and tries to access auth routes (login/signup),
  // redirect them to the homepage
  if (isAuthenticated && isPublicRoute) {
    // Increment redirect count
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('redirect_count', String(redirectCount + 1), { path: '/' });
    return response;
  }
  
  // For normal navigation, reset the counter
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