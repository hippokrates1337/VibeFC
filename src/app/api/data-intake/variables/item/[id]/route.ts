import { NextResponse } from 'next/server';
import {
  getBackendBaseUrl,
  getForwardHeaders,
  parseBackendJson,
} from '../../_lib/proxy-utils';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = getBackendBaseUrl();
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { message: 'Variable ID is required' },
        { status: 400 }
      );
    }

    let organizationId: string | undefined;
    try {
      const requestData = await request.json();
      organizationId = requestData.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { message: 'organizationId is required in request body' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { message: 'Invalid request body format. Expected JSON with organizationId.' },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendUrl}/data-intake/variables`, {
      method: 'DELETE',
      headers: getForwardHeaders(request),
      body: JSON.stringify({ ids: [id], organizationId }),
    });
    const { data, parseError } = await parseBackendJson<{ message?: string }>(response, {
      message: response.ok ? 'Variable deleted successfully' : 'Backend request failed',
    });

    if (parseError && !response.ok) {
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

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 