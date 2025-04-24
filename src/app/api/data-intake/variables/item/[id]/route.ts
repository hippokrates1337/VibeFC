import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('==== DELETE API HANDLER START ====');
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const { id } = params;
    
    console.log('Delete request received for variable ID:', id);
    
    if (!id) {
      console.log('Missing variable ID, returning 400');
      return NextResponse.json(
        { message: 'Variable ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the ID is a valid UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(id);
    console.log(`ID validation: ${id} is ${isValidUuid ? 'a valid' : 'NOT a valid'} UUID v4`);
    
    if (!isValidUuid) {
      console.warn(`Variable ID ${id} is not a valid UUID v4 format`);
      // Continue anyway, but log the warning
    }
    
    // Forward delete request to backend
    try {
      // The backend expects a POST body with an array of IDs, not a path parameter
      const requestPayload = { ids: [id] };
      console.log('Sending delete request to backend:', JSON.stringify(requestPayload));
      console.log('Backend URL:', `${backendUrl}/data-intake/variables`);
      
      const response = await fetch(`${backendUrl}/data-intake/variables`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      console.log(`Delete response status: ${response.status} ${response.statusText}`);
      
      // Check if response is empty (which is common for DELETE requests)
      const contentType = response.headers.get('content-type');
      let data = null;
      
      if (contentType && contentType.includes('application/json')) {
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (responseText) {
          try {
            data = JSON.parse(responseText);
            console.log('Parsed response data:', JSON.stringify(data));
          } catch (e) {
            console.error('Failed to parse response JSON:', e);
            return NextResponse.json(
              { message: 'Failed to parse backend response' },
              { status: 500 }
            );
          }
        }
      } else {
        console.log('Response has non-JSON content type:', contentType);
      }
      
      if (!response.ok) {
        return NextResponse.json(
          { message: data?.message || 'Backend request failed' },
          { status: response.status }
        );
      }
      
      // Return success response
      console.log('Successfully deleted variable, returning response to client');
      return NextResponse.json(
        data || { message: 'Variable deleted successfully' }
      );
    } catch (fetchError) {
      console.error('Fetch error during delete operation:', fetchError);
      return NextResponse.json(
        { 
          message: fetchError instanceof Error ? fetchError.message : 'Backend connection error',
          details: "Could not connect to the backend server. Please ensure it's running."
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in DELETE handler:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    console.log('==== DELETE API HANDLER END ====');
  }
} 