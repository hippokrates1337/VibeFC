import { logger } from '@/lib/utils/logger';

export const getBackendBaseUrl = (): string =>
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const getForwardHeaders = (request: Request, includeJsonContentType = true): HeadersInit => {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const headers: HeadersInit = {};

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  return headers;
};

export const parseBackendJson = async <T>(
  response: Response,
  defaultData: T
): Promise<{ data: T; parseError: boolean }> => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    return { data: defaultData, parseError: false };
  }

  try {
    return { data: JSON.parse(responseText) as T, parseError: false };
  } catch (error) {
    logger.warn('api.variables.proxy.parse-failed', {
      status: response.status,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return { data: defaultData, parseError: true };
  }
};
