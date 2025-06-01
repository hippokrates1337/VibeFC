import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    // Server-side variables (using NEXT_PUBLIC for consistency)
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'Not configured',
    nextRuntime: process.env.NEXT_RUNTIME || 'Unknown',
    nodeEnv: process.env.NODE_ENV || 'Unknown',
    
    // Client-side variables (NEXT_PUBLIC_*)
    publicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured',
    publicSupabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured (hidden)' : 'Not configured',
    publicBackendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'Not configured',
    
    // Environment variable loading check
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.startsWith('NEXT_PUBLIC_') || 
      key.includes('SUPABASE') || 
      key.includes('BACKEND')
    ).sort(),
    
    // Debugging info
    nodeVersion: process.version,
    platform: process.platform,
    envCount: Object.keys(process.env).length,
    
    // Missing variables (add these to .env.local)
    missingVars: [
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
      ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? [] : ['NEXT_PUBLIC_SUPABASE_ANON_KEY']),
      ...(process.env.NEXT_PUBLIC_BACKEND_URL ? [] : ['NEXT_PUBLIC_BACKEND_URL'])
    ]
  });
} 