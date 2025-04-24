import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Extract userId from the URL search params, if provided
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'frontend-user';
    
    console.log(`GET /api/data-intake/variables - Redirecting to user endpoint`);
    
    // Redirect to the new user-specific endpoint
    return NextResponse.redirect(new URL(`/api/data-intake/variables/user/${userId}`, request.url));
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { message: 'Internal server error', variables: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const body = await request.json();
    
    console.log('POST /api/data-intake/variables received:', JSON.stringify(body));
    
    // Forward to backend
    try {
      const response = await fetch(`${backendUrl}/data-intake/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const responseText = await response.text();
      console.log('Backend response:', responseText);
      
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

export async function PUT(request: Request) {
  console.log('==== PUT API HANDLER START ====');
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const body = await request.json();
    
    console.log('PUT /api/data-intake/variables received:', JSON.stringify(body));
    
    if (!body.variables || !Array.isArray(body.variables) || body.variables.length === 0) {
      console.log('Invalid request body, missing variables array');
      return NextResponse.json(
        { message: 'Request must include a non-empty variables array' },
        { status: 400 }
      );
    }
    
    // Forward to backend
    try {
      console.log('Forwarding update request to backend:', JSON.stringify(body));
      console.log('Backend URL:', `${backendUrl}/data-intake/variables`);
      
      const response = await fetch(`${backendUrl}/data-intake/variables`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      console.log(`Update response status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log('Backend response:', responseText);
      
      let data;
      
      try {
        // Attempt to parse, default to success message if responseText is empty
        data = responseText ? JSON.parse(responseText) : { message: 'Update successful' };
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        // If the original fetch was OK (e.g., 200) but parsing failed,
        // still return the original success status but indicate parsing issue or use default.
        if (response.ok) {
          // Return original success status with a default success message
          return NextResponse.json(
            { message: 'Update successful' }, // Or provide more specific msg
            { status: response.status } // Use original status (e.g., 200)
          );
        } else {
          // If the original fetch failed AND parsing failed, return 500
          return NextResponse.json(
            { message: 'Failed to parse backend error response' },
            { status: 500 }
          );
        }
      }
      
      if (!response.ok) {
        return NextResponse.json(
          { message: data.message || 'Backend request failed' },
          { status: response.status }
        );
      }
      
      console.log('Successfully updated variables, returning response to client');
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Fetch error during update operation:', fetchError);
      return NextResponse.json(
        { 
          message: fetchError instanceof Error ? fetchError.message : 'Backend connection error',
          details: "Could not connect to the backend server. Please ensure it's running."
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in PUT handler:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    console.log('==== PUT API HANDLER END ====');
  }
} 