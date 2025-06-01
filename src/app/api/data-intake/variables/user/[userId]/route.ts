import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    console.log(`GET /api/data-intake/variables/user/${userId} - Fetching variables for user`);
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    // Forward to backend
    try {
      const response = await fetch(`${backendUrl}/data-intake/variables/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store' // Ensure we don't cache the response
      });
      
      const responseText = await response.text();
      console.log(`Backend response for user ${userId}:`, responseText);
      
      // If the response is empty, return an empty array to prevent JSON parse errors
      if (!responseText || responseText.trim() === '') {
        return NextResponse.json({ 
          message: 'No data returned from backend', 
          variables: [] 
        });
      }
      
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse backend response JSON:', e);
        return NextResponse.json(
          { message: 'Failed to parse backend response', variables: [] },
          { status: 500 }
        );
      }
      
      if (!response.ok) {
        return NextResponse.json(
          { message: data.message || 'Backend request failed', variables: [] },
          { status: response.status }
        );
      }
      
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error fetching from backend:', fetchError);
      return NextResponse.json(
        { 
          message: fetchError instanceof Error ? fetchError.message : 'Backend connection error',
          details: "Could not connect to the backend server. Please ensure it's running.",
          variables: []
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { message: 'Internal server error', variables: [] },
      { status: 500 }
    );
  }
} 