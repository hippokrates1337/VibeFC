export interface ProtectedLayoutLoadingStateInput {
  isAuthLoading: boolean;
  hasUser: boolean;
  organizationCount: number;
  isOrganizationLoading: boolean;
  organizationError: string | null;
}

export const computeProtectedLayoutLoadingState = ({
  isAuthLoading,
  hasUser,
  organizationCount,
  isOrganizationLoading,
  organizationError,
}: ProtectedLayoutLoadingStateInput): boolean =>
  isAuthLoading || (hasUser && organizationCount === 0 && !organizationError && isOrganizationLoading);
