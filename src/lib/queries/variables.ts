'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toStoreVariable, type Variable } from '@/lib/store/variables';

/**
 * The variables of every organization the signed-in user belongs to (one backend call).
 * Signing out clears the query cache, so the key needs no user id.
 */
export const variableKeys = {
  all: ['variables'] as const,
};

/** All variables the signed-in user can read (GET /data-intake/variables/:userId via the Next proxy). */
export async function fetchUserVariables(): Promise<Variable[]> {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }
  const response = await fetch(`/api/data-intake/variables/user/${encodeURIComponent(session.user.id)}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Failed to load variables (status ${response.status})`);
  }
  return Array.isArray(data?.variables) ? data.variables.map(toStoreVariable) : [];
}

/**
 * The variables of one organization (none for null), or of all the user's organizations
 * when called without an argument. Loaded once and filtered per organization, so an
 * organization switch needs no reload.
 */
export function useVariables(organizationId?: string | null) {
  return useQuery({
    queryKey: variableKeys.all,
    queryFn: fetchUserVariables,
    select: useCallback(
      (variables: Variable[]) =>
        organizationId === undefined ? variables : variables.filter((v) => v.organizationId === organizationId),
      [organizationId]
    ),
  });
}

/** Reloads the variables, e.g. after saving or deleting one. */
export function useReloadVariables(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: variableKeys.all }), [queryClient]);
}
