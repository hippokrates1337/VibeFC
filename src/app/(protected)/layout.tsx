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
    if (!isLoading && !user) {
      router.push('/landing');
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
  
  // Fetch forecast data when organization is selected
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
  
  // Show loading state
  if (isLoading || 
      (currentOrganization && variableStoreIsLoading && !variablesLoaded) || 
      (currentOrganization && forecastStoreIsLoading && !forecastsLoaded && !useForecastGraphStore.getState().error)
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  // If not authenticated, don't render the children
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg">
              VibeFC
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/" className="text-sm font-medium">
                Home
              </Link>
              <Link href="/organizations" className="text-sm font-medium">
                Organizations
              </Link>
              <Link href="/data-intake" className="text-sm font-medium">
                Data Intake
              </Link>
              <Link href="/forecast-definition" className="text-sm font-medium">
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