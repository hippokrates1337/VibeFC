/**
 * Concatenates `NEXT_PUBLIC_BACKEND_URL` with an API path without a duplicate `/`.
 * A trailing slash on the base (common in Vercel/env UI) plus a path like `/forecasts`
 * becomes `//forecasts`, which often 308-redirects and breaks CORS in the browser.
 */
export function joinBackendUrl(
  baseUrl: string | undefined | null,
  path: string
): string {
  const rel = path.startsWith('/') ? path : `/${path}`;
  if (baseUrl == null || baseUrl.trim() === '') {
    return rel;
  }
  const base = baseUrl.trim().replace(/\/+$/, '');
  return `${base}${rel}`;
}
