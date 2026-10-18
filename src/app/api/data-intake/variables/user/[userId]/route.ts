import { NextResponse } from 'next/server';
import {
  getBackendBaseUrl,
  getForwardHeaders,
  parseBackendJson,
} from '../../_lib/proxy-utils';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
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
  } catch {
    return NextResponse.json(
      { message: 'Internal server error', variables: [] },
      { status: 500 }
    );
  }
} 