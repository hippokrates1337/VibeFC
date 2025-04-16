import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const body = await request.json();
    
    // Forward to backend
    try {
      const response = await fetch(`${backendUrl}/data-intake/add-variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return NextResponse.json(
          { message: 'Failed to parse backend response' },
          { status: 500 }
        );
      }
      
      if (!response.ok) {
        return NextResponse.json(
          { message: data.message || 'Backend request failed' },
          { status: response.status }
        );
      }
      
      return NextResponse.json(data);
    } catch (fetchError) {
      return NextResponse.json(
        { 
          message: fetchError instanceof Error ? fetchError.message : 'Backend connection error',
          details: "Could not connect to the backend server. Please ensure it's running."
        },
        { status: 502 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 