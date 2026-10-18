import { evaluateAuthRedirect } from '@/lib/auth/redirect-policy';

describe('evaluateAuthRedirect', () => {
  it('redirects unauthenticated user from protected route to login', () => {
    const result = evaluateAuthRedirect({
      isAuthenticated: false,
      isPublicRoute: false,
      pathname: '/forecast-definition',
    });

    expect(result).toEqual({
      type: 'redirect',
      destination: '/login',
    });
  });

  it('redirects authenticated user away from auth route to home', () => {
    const result = evaluateAuthRedirect({
      isAuthenticated: true,
      isPublicRoute: true,
      pathname: '/login',
    });

    expect(result).toEqual({
      type: 'redirect',
      destination: '/',
    });
  });

  it('allows navigation for authenticated user on protected route', () => {
    const result = evaluateAuthRedirect({
      isAuthenticated: true,
      isPublicRoute: false,
      pathname: '/forecast-definition',
    });

    expect(result).toEqual({ type: 'next' });
  });

  it('allows navigation for unauthenticated user on login route', () => {
    const result = evaluateAuthRedirect({
      isAuthenticated: false,
      isPublicRoute: true,
      pathname: '/login',
    });

    expect(result).toEqual({ type: 'next' });
  });
});
