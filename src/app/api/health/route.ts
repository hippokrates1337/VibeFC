import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Test 1: Check if we can access backend health endpoint
    console.log(`Testing backend connection at: ${backendUrl}/health`);
    const healthResponse = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Set a short timeout to avoid hanging requests
      signal: AbortSignal.timeout(5000)
    });
    
    const healthStatus = healthResponse.ok ? 'OK' : 'FAILED';
    let healthData = null;
    
    try {
      healthData = await healthResponse.json();
    } catch (e) {
      console.error('Failed to parse health response as JSON');
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      frontend: {
        status: 'OK',
        environment: process.env.NODE_ENV
      },
      backend: {
        url: backendUrl,
        health_check: {
          status: healthStatus,
          statusCode: healthResponse.status,
          data: healthData
        }
      },
      env_vars: {
        backend_url_set: !!process.env.BACKEND_URL
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      backend_url: process.env.BACKEND_URL || 'http://localhost:3001'
    }, { status: 500 });
  }
} 