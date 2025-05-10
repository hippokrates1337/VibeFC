import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    // Exchange the auth code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.session) {
      // Store the session in a cookie
      const cookieStore = cookies();
      cookieStore.set('sb-access-token', data.session.access_token, {
        maxAge: data.session.expires_in,
        path: '/',
      });
      
      // Redirect to the dashboard or organizations page
      return NextResponse.redirect(new URL('/organizations', request.url));
    }
  }
  
  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
} 