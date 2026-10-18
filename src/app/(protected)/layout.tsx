'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useOrganizationStore } from '@/lib/store/organization';
import { 
  useSetSelectedOrganizationId, 
  useFetchVariables 
} from '@/lib/store/variables';
import { computeProtectedLayoutLoadingState } from './layout-loading-state';
import { isDebugToolsEnabled } from '@/lib/config/feature-flags';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut, session } = useAuth();
  const router = useRouter();
  const fetchOrganizationData = useOrganizationStore((state) => state.fetchOrganizationData);
  const organizations = useOrganizationStore((state) => state.organizations);
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const orgStoreIsLoading = useOrganizationStore((state) => state.isLoading);
  const orgStoreError = useOrganizationStore((state) => state.error);
  
  // Variable store actions and state
  const setSelectedOrgIdForVariables = useSetSelectedOrganizationId();
  const fetchVariablesForOrg = useFetchVariables();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);
  
  // Fetch organization data once when logged in with no orgs. Do not depend on
  // `organizations` (array identity changes every time Zustand sets `[]`, which
  // would retrigger this effect and loop refetches / loading skeleton forever).
  useEffect(() => {
    if (user && session?.access_token && organizations.length === 0) {
      fetchOrganizationData(user.id, session.access_token);
    }
  }, [user?.id, session?.access_token, fetchOrganizationData, organizations.length]);
  
  // Fetch variable data when organization is selected
  useEffect(() => {
    if (user && session?.access_token && currentOrganization?.id) {
      setSelectedOrgIdForVariables(currentOrganization.id);
      fetchVariablesForOrg(user.id, session.access_token);
    }
  }, [
    user?.id,
    session?.access_token,
    currentOrganization?.id,
    setSelectedOrgIdForVariables,
    fetchVariablesForOrg,
  ]);
  
  const shouldShowLoading = computeProtectedLayoutLoadingState({
    isAuthLoading: isLoading,
    hasUser: Boolean(user),
    organizationCount: organizations.length,
    isOrganizationLoading: orgStoreIsLoading,
    organizationError: orgStoreError,
  });

  if (shouldShowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg text-slate-100 hover:text-blue-400 transition-colors">
              VibeFC
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                Home
              </Link>
              <Link href="/organizations" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                Organizations
              </Link>
              <Link href="/data-intake" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                Data Intake
              </Link>
              <Link href="/forecast-definition" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                Forecast Definition
              </Link>
              <Link href="/forecast-display" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                Forecast Display
              </Link>
              {isDebugToolsEnabled() && (
                <Link href="/debug-calc" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Debug Calc
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <OrganizationSelector />
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
              }}
              className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">{children}</main>
    </div>
  );
} 