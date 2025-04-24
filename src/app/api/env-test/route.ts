import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    backendUrl: process.env.BACKEND_URL || 'Not configured',
    nextRuntime: process.env.NEXT_RUNTIME || 'Unknown',
    nodeEnv: process.env.NODE_ENV || 'Unknown'
  });
} 