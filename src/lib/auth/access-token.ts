/**
 * The current access token for backend requests, or undefined when signed out.
 * supabase-js refreshes an expired token before returning it, so requests keep working
 * after the hourly expiry (a cookie copy of the token expired with it).
 */
export async function getAccessToken(): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined;
  // Loaded on first use: the API clients import this module, and the Supabase client
  // needs its environment variables, which modules (and tests) without requests lack.
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
