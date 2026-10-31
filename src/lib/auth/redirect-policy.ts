export interface AuthRedirectEvaluationInput {
  isAuthenticated: boolean;
  isPublicRoute: boolean;
  pathname: string;
  /** Query string of the request, including '?' (or empty). Kept in returnTo. */
  search?: string;
  /** The returnTo query parameter of a public route such as /login. */
  returnTo?: string | null;
}

export interface AuthRedirectEvaluationResult {
  type: 'next' | 'redirect';
  destination?: string;
}

const PUBLIC_ROUTES = ['/login', '/signup', '/auth/callback', '/forgot-password'];

export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

/**
 * Where to go after signing in: a returnTo value if it is a path inside this app
 * (not another site, not a public page), else '/'.
 */
export const safeReturnTo = (returnTo: string | null | undefined): string => {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\')) {
    return '/';
  }
  const pathname = returnTo.split(/[?#]/)[0];
  return isPublicPath(pathname) ? '/' : returnTo;
};

/** /login, remembering the page to come back to. */
export const loginPathFor = (pathname: string, search = ''): string =>
  pathname === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(pathname + search)}`;

export const evaluateAuthRedirect = ({
  isAuthenticated,
  isPublicRoute,
  pathname,
  search = '',
  returnTo,
}: AuthRedirectEvaluationInput): AuthRedirectEvaluationResult => {
  if (!isAuthenticated && !isPublicRoute && pathname !== '/login') {
    return { type: 'redirect', destination: loginPathFor(pathname, search) };
  }

  if (isAuthenticated && isPublicRoute) {
    return { type: 'redirect', destination: safeReturnTo(returnTo) };
  }

  return { type: 'next' };
};
