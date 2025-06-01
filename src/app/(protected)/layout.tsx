'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useOrganizationStore } from '@/lib/store/organization';
import { 
  useVariableStore, 
  useSetSelectedOrganizationId, 
  useFetchVariables 
} from '@/lib/store/variables';
import { forecastApi } from '@/lib/api/forecast';
import { 
  useForecastGraphStore,
  useLoadOrganizationForecasts 
} from '@/lib/store/forecast-graph-store';

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
  
  // Variable store actions and state
  const setSelectedOrgIdForVariables = useSetSelectedOrganizationId();
  const fetchVariablesForOrg = useFetchVariables();
  const variableStoreIsLoading = useVariableStore(state => state.isLoading);
  const variablesLoaded = useVariableStore(state => state.variables.length > 0 && !state.isLoading);

  // Forecast store action
  const loadOrgForecastsAction = useLoadOrganizationForecasts();
  const forecastStoreIsLoading = useForecastGraphStore(state => state.isLoading);
  const forecastsLoaded = useForecastGraphStore(state => state.organizationForecasts.length > 0 && !state.isLoading);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    console.log('🛡️ PROTECTED LAYOUT: Auth check effect triggered', {
      isLoading,
      hasUser: !!user,
      shouldRedirect: !isLoading && !user,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'SSR'
    });
    
    if (!isLoading && !user) {
      console.log('🛡️ PROTECTED LAYOUT: Redirecting to root - user not authenticated');
      console.log('🛡️ PROTECTED LAYOUT: About to call router.push("/")');
      try {
        router.push('/');
        console.log('🛡️ PROTECTED LAYOUT: router.push("/") executed');
      } catch (error) {
        console.error('🛡️ PROTECTED LAYOUT: router.push failed:', error);
      }
    }
  }, [user, isLoading, router]);
  
  // Fetch organization data
  useEffect(() => {
    if (user && session?.access_token && organizations.length === 0) {
      fetchOrganizationData(user.id, session.access_token);
    }
  }, [user, session, fetchOrganizationData, organizations]);
  
  // Fetch variable data when organization is selected
  useEffect(() => {
    if (user && session?.access_token && currentOrganization?.id) {
      setSelectedOrgIdForVariables(currentOrganization.id);
      fetchVariablesForOrg(user.id, session.access_token);
    }
  }, [user, session, currentOrganization, setSelectedOrgIdForVariables, fetchVariablesForOrg]);
  
  // Fetch forecast data when organization is selected - TEMPORARILY DISABLED FOR DEBUGGING
  /*
  useEffect(() => {
    const fetchAndLoadForecasts = async () => {
      if (user && session?.access_token && currentOrganization?.id) {
        try {
          // Consider adding a loading state specific to this fetch if needed
          const { data, error } = await forecastApi.getForecasts(currentOrganization.id);
          if (error) {
            console.error('Failed to fetch organization forecasts:', error.message);
            // Optionally set an error state in forecastGraphStore here
            return;
          }
          if (data) {
            loadOrgForecastsAction(data);
          }
        } catch (apiError) {
          console.error('Error calling forecastApi.getForecasts:', apiError);
        }
      }
    };
    fetchAndLoadForecasts();
  }, [user, session, currentOrganization, loadOrgForecastsAction]);
  */
  
  // Show loading state with more specific conditions to prevent infinite loading
  const orgStore = useOrganizationStore.getState();
  const varStore = useVariableStore.getState();
  const forecastStore = useForecastGraphStore.getState();
  
  const shouldShowLoading = 
    isLoading || // Auth loading
    (!user && !isLoading) || // No user but not loading (should redirect)
    (user && organizations.length === 0 && !orgStore.error && !orgStore.isLoading); // User exists, no orgs loaded, no error, not currently loading
    
  console.log('🔍 PROTECTED LAYOUT DEBUG:', {
    isLoading,
    hasUser: !!user,
    userId: user?.id,
    organizationCount: organizations.length,
    currentOrg: currentOrganization?.name,
    variableStoreIsLoading,
    variablesLoaded,
    orgStoreError: orgStore.error,
    orgStoreIsLoading: orgStore.isLoading,
    varStoreError: varStore.error,
    varStoreIsLoading: varStore.isLoading,
    varStoreCount: varStore.variables.length,
    forecastStoreIsLoading: forecastStore.isLoading,
    forecastStoreError: forecastStore.error,
    forecastCount: forecastStore.organizationForecasts.length,
    shouldShowLoading,
    timestamp: new Date().toISOString()
  });
    
  if (shouldShowLoading) {
    console.log('🛡️ PROTECTED LAYOUT: Showing loading spinner', {
      reason: shouldShowLoading ? 'shouldShowLoading is true' : 'unknown',
      isLoading,
      hasUser: !!user,
      orgCount: organizations.length,
      orgError: orgStore.error,
      orgIsLoading: orgStore.isLoading
    });
    
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }
  
  // If not authenticated, don't render the children
  if (!user) {
    console.log('🛡️ PROTECTED LAYOUT: No user, returning null');
    return null;
  }
  
  console.log('🛡️ PROTECTED LAYOUT: Rendering layout with children');
  
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