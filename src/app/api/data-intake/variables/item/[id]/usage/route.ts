import { NextResponse } from 'next/server';
import {
  getBackendBaseUrl,
  getForwardHeaders,
  parseBackendJson,
} from '../../../_lib/proxy-utils';

/** Forecasts that use a variable: GET /data-intake/variables/:id/usage on the backend. */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(
      `${getBackendBaseUrl()}/data-intake/variables/${encodeURIComponent(params.id)}/usage`,
      {
        method: 'GET',
        headers: getForwardHeaders(request, false),
        cache: 'no-store',
      }
    );
    const { data, parseError } = await parseBackendJson<{ message?: string; forecasts?: unknown[] }>(response, {
      message: 'No data returned from backend',
      forecasts: [],
    });

    if (parseError) {
      return NextResponse.json({ message: 'Failed to parse backend response' }, { status: 500 });
    }
    if (!response.ok) {
      return NextResponse.json({ message: data.message || 'Backend request failed' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 502 }
    );
  }
}
