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

// Initialize the Supabase client with public anon key (client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}); 