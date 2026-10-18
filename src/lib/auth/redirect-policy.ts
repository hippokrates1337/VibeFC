export interface AuthRedirectEvaluationInput {
  isAuthenticated: boolean;
  isPublicRoute: boolean;
  pathname: string;
}

export interface AuthRedirectEvaluationResult {
  type: 'next' | 'redirect';
  destination?: string;
}

export const evaluateAuthRedirect = ({
  isAuthenticated,
  isPublicRoute,
  pathname,
}: AuthRedirectEvaluationInput): AuthRedirectEvaluationResult => {
  if (!isAuthenticated && !isPublicRoute && pathname !== '/login') {
    return { type: 'redirect', destination: '/login' };
  }

  if (isAuthenticated && isPublicRoute) {
    return { type: 'redirect', destination: '/' };
  }

  return { type: 'next' };
};
