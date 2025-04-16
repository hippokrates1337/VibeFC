import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Check backend health
    try {
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      
      const backendStatus = healthResponse.ok ? 'online' : 'error';
      let backendData = null;
      
      try {
        backendData = await healthResponse.json();
      } catch (e) {
        // Ignore parse errors
      }
      
      return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          frontend: {
            status: 'online',
            environment: process.env.NODE_ENV
          },
          backend: {
            status: backendStatus,
            url: backendUrl,
            response: backendData
          }
        }
      });
    } catch (error) {
      return NextResponse.json({
        status: 'warning',
        timestamp: new Date().toISOString(),
        services: {
          frontend: {
            status: 'online',
            environment: process.env.NODE_ENV
          },
          backend: {
            status: 'offline',
            url: backendUrl,
            error: error instanceof Error ? error.message : 'Connection failed'
          }
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed'
    }, { status: 500 });
  }
} 