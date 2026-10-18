import { NextResponse } from 'next/server';
import {
  getBackendBaseUrl,
  getForwardHeaders,
  parseBackendJson,
} from './_lib/proxy-utils';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { message: 'Query parameter userId is required', variables: [] },
        { status: 400 }
      );
    }

    const backendUrl = getBackendBaseUrl();
    const response = await fetch(`${backendUrl}/data-intake/variables/${userId}`, {
      method: 'GET',
      headers: getForwardHeaders(request, false),
      cache: 'no-store',
    });
    const { data, parseError } = await parseBackendJson<{ message?: string; variables?: unknown[] }>(response, {
      message: 'No data returned from backend',
      variables: [],
    });

    if (parseError) {
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
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
          details: "Could not connect to the backend server. Please ensure it's running.",
          variables: [],
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error', variables: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const backendUrl = getBackendBaseUrl();
    const body = await request.json();

    const response = await fetch(`${backendUrl}/data-intake/variables`, {
      method: 'POST',
      headers: getForwardHeaders(request),
      body: JSON.stringify(body),
    });

    const { data, parseError } = await parseBackendJson<{ message?: string }>(response, {
      message: response.ok ? 'Variables saved successfully' : 'Backend request failed',
    });

    if (parseError) {
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
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
          details: "Could not connect to the backend server. Please ensure it's running.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const backendUrl = getBackendBaseUrl();
    const body = await request.json();

    if (!body.variables || !Array.isArray(body.variables) || body.variables.length === 0) {
      return NextResponse.json(
        { message: 'Request must include a non-empty variables array' },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendUrl}/data-intake/variables`, {
      method: 'PUT',
      headers: getForwardHeaders(request),
      body: JSON.stringify(body),
    });
    const { data, parseError } = await parseBackendJson<{ message?: string }>(response, {
      message: response.ok ? 'Update successful' : 'Backend request failed',
    });

    if (parseError && !response.ok) {
      return NextResponse.json(
        { message: 'Failed to parse backend error response' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Backend request failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
          details: "Could not connect to the backend server. Please ensure it's running.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const backendUrl = getBackendBaseUrl();
    const body = await request.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { message: 'Request must include a non-empty ids array' },
        { status: 400 }
      );
    }

    if (!body.organizationId) {
      return NextResponse.json(
        { message: 'Request must include organizationId' },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendUrl}/data-intake/variables`, {
      method: 'DELETE',
      headers: getForwardHeaders(request),
      body: JSON.stringify(body),
    });
    const { data, parseError } = await parseBackendJson<{ message?: string; count?: number }>(response, {
      message: response.ok ? 'Delete successful' : 'Backend request failed',
      count: body.ids.length,
    });

    if (parseError && !response.ok) {
      return NextResponse.json(
        { message: 'Failed to parse backend error response' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Backend request failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
          details: "Could not connect to the backend server. Please ensure it's running.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 