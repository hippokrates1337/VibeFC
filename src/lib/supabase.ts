import { createClient } from '@supabase/supabase-js';

// Types for our database schema
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
}

export interface OrganizationMember {
  id: number;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  joined_at: string;
  email?: string;
}

// Primary approach: use bundled environment variables
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Fallback approach: try runtime config if bundling failed
if (!supabaseUrl && typeof window !== 'undefined') {
  console.warn('⚠️ Environment variables not bundled, trying runtime config...');
  const runtimeConfig = (window as any).__NEXT_RUNTIME_CONFIG__;
  if (runtimeConfig) {
    supabaseUrl = runtimeConfig.NEXT_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = runtimeConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
}

// Final fallback: hard-coded values for development (TEMPORARY)
if (!supabaseUrl && typeof window !== 'undefined') {
  console.warn('⚠️ Using hardcoded Supabase URL for development');
  supabaseUrl = 'https://rfjcfypsaixxenafuxky.supabase.co';
  // Note: You'll need to get the anon key from your Supabase dashboard
}

console.log('🔍 SUPABASE INIT:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey?.substring(0, 10) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}); 