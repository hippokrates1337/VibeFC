import { evaluateAuthRedirect, safeReturnTo } from '@/lib/auth/redirect-policy';

describe('evaluateAuthRedirect', () => {
  it('redirects unauthenticated user from protected route to login, remembering the page', () => {
    const result = evaluateAuthRedirect({
      isAuthenticated: false,
      isPublicRoute: false,
      pathname: '/forecast-definition/abc',
      search: '?tab=1',
    });

    expect(result).toEqual({
      type: 'redirect',
      destination: '/login?returnTo=%2Fforecast-definition%2Fabc%3Ftab%3D1',
    });
  });

  it('sends an unauthenticated user on the home page to plain /login', () => {
    expect(evaluateAuthRedirect({ isAuthenticated: false, isPublicRoute: false, pathname: '/' })).toEqual({
      type: 'redirect',
      destination: '/login',
    });
  });

  it('sends a signed-in user on /login back to returnTo', () => {
    const result = evaluateAuthRedirect({
      isAuthenticated: true,
      isPublicRoute: true,
      pathname: '/login',
      returnTo: '/forecast-display',
    });

    expect(result).toEqual({ type: 'redirect', destination: '/forecast-display' });
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

describe('safeReturnTo', () => {
  it('keeps paths inside the app', () => {
    expect(safeReturnTo('/data-intake')).toBe('/data-intake');
    expect(safeReturnTo('/forecast-definition/abc?x=1')).toBe('/forecast-definition/abc?x=1');
  });

  it('falls back to / for other sites, public pages and missing values', () => {
    for (const value of [null, undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/login', '/signup?x=1']) {
      expect(safeReturnTo(value)).toBe('/');
    }
  });
});
