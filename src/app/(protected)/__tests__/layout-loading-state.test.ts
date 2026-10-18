import { computeProtectedLayoutLoadingState } from '../layout-loading-state';

describe('computeProtectedLayoutLoadingState', () => {
  it('returns true while auth is loading', () => {
    const result = computeProtectedLayoutLoadingState({
      isAuthLoading: true,
      hasUser: false,
      organizationCount: 0,
      isOrganizationLoading: false,
      organizationError: null,
    });

    expect(result).toBe(true);
  });

  it('returns true when authenticated user is waiting for organizations', () => {
    const result = computeProtectedLayoutLoadingState({
      isAuthLoading: false,
      hasUser: true,
      organizationCount: 0,
      isOrganizationLoading: true,
      organizationError: null,
    });

    expect(result).toBe(true);
  });

  it('returns false once organizations finished loading with no records', () => {
    const result = computeProtectedLayoutLoadingState({
      isAuthLoading: false,
      hasUser: true,
      organizationCount: 0,
      isOrganizationLoading: false,
      organizationError: null,
    });

    expect(result).toBe(false);
  });

  it('returns false when organizations exist', () => {
    const result = computeProtectedLayoutLoadingState({
      isAuthLoading: false,
      hasUser: true,
      organizationCount: 2,
      isOrganizationLoading: false,
      organizationError: null,
    });

    expect(result).toBe(false);
  });
});
