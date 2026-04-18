'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useOrganizationStore } from '@/lib/store/organization';
import { useVariableStore } from '@/lib/store/variables';
import { useForecastGraph, useForecastGraphActions } from '@/lib/store/forecast-graph-store/hooks';
import { mapSupabaseForecastRowToClient } from '@/lib/api/forecast';
import { organizationApi } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null; confirmationSent?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  console.log('🔐 AUTH PROVIDER STATE:', {
    hasUser: !!user,
    userId: user?.id,
    hasSession: !!session,
    isLoading,
    timestamp: new Date().toISOString()
  });

  const fetchOrgData = useOrganizationStore.getState().fetchOrganizationData;
  const clearOrgData = useOrganizationStore.getState().clearOrganizationData;
  const fetchVars = useVariableStore.getState().fetchVariables;
  const clearVars = useVariableStore.getState().clearVariables;
  
  // Safe destructuring with fallbacks to prevent undefined function references
  const forecastActions = useForecastGraphActions();
  const loadOrgForecasts = forecastActions?.loadOrganizationForecasts || (() => {});
  const clearForecasts = forecastActions?.resetStore || (() => {});
  const setForecastLoading = forecastActions?.setLoading || (() => {});
  const setForecastError = forecastActions?.setError || (() => {});
  
  const { organizationId: currentForecastOrgId, isDirty } = useForecastGraph();

  // Create stable function references with empty dependency arrays since we ensure stable references above
  const memoizedLoadOrgForecasts = useCallback(loadOrgForecasts, []);
  const memoizedClearForecasts = useCallback(clearForecasts, []);
  const memoizedSetForecastLoading = useCallback(setForecastLoading, []);
  const memoizedSetForecastError = useCallback(setForecastError, []);

  const triggerInitialDataFetch = useCallback(async (session: Session | null) => {
    const userId = session?.user?.id;
    const token = session?.access_token;

    console.log('🔐 [AuthProvider] triggerInitialDataFetch called:', {
      hasUserId: !!userId,
      hasToken: !!token,
      userId
    });

    if (userId && token) {
      console.log('[AuthProvider] Valid session detected, fetching initial org and variable data for user:', userId);
      try {
        const claimRes = await organizationApi.claimPendingInvites();
        if (claimRes.data?.claimed && claimRes.data.claimed > 0) {
          console.log('[AuthProvider] Claimed pending organization invitations:', claimRes.data.claimed);
        }
      } catch (e) {
        console.warn('[AuthProvider] claim-invites request failed (non-fatal):', e);
      }
      fetchOrgData(userId, token);
      fetchVars(userId, token);
      // Forecast data will be fetched by the new useEffect hook below when organization data is ready.
    } else {
      console.log('[AuthProvider] No valid session/user/token, skipping initial data fetch.');
    }
  }, [fetchOrgData, fetchVars]);

  const clearAllAppData = useCallback((preserveUnsavedForecasts = false) => {
    console.log('[AuthProvider] Clearing all app data (stores and localStorage)...');
    clearOrgData();
    clearVars();
    
    // Only clear forecast store if we're not preserving unsaved changes
    if (!preserveUnsavedForecasts) {
      clearForecasts();
    } else {
      if (isDirty) {
        console.log('[AuthProvider] Preserving unsaved forecast changes during data clear');
      } else {
        clearForecasts();
      }
    }
    
    localStorage.removeItem('currentOrganizationId');
    removeAuthCookie();
  }, [clearOrgData, clearVars, clearForecasts]);

  // Store token in cookie
  const setAuthCookie = (token: string, expiresIn: number) => {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + expiresIn);
    const cookieValue = `sb-access-token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    
    console.log('🍪 [AuthProvider] Setting auth cookie:', {
      token: token.substring(0, 20) + '...',
      expiresIn,
      expires: expires.toUTCString(),
      cookieValue: cookieValue.substring(0, 100) + '...'
    });
    
    document.cookie = cookieValue;
  };

  // Remove auth cookie
  const removeAuthCookie = () => {
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'redirect_count=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  };

  useEffect(() => {
    // Get initial session
    console.log('🔐 [AuthProvider] Starting initial session fetch...');
    
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('🔐 [AuthProvider] Initial session result:', {
        hasSession: !!initialSession,
        hasUser: !!initialSession?.user,
        hasToken: !!initialSession?.access_token,
        userId: initialSession?.user?.id
      });
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      console.log('🔐 [AuthProvider] Setting isLoading to FALSE');
      setIsLoading(false);
      
      if (initialSession?.access_token) {
        setAuthCookie(initialSession.access_token, initialSession.expires_in);
        triggerInitialDataFetch(initialSession);
      } else {
        console.log('🔐 [AuthProvider] No session/token, clearing app data');
        clearAllAppData(); // No session, safe to clear everything
      }
    }).catch(err => {
      console.error('[AuthProvider] Error getting initial session:', err);
      console.log('🔐 [AuthProvider] Setting isLoading to FALSE (error case)');
      setIsLoading(false);
      clearAllAppData(); // Error case, safe to clear everything
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state change event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        if (session?.access_token) {
          setAuthCookie(session.access_token, session.expires_in);

          const currentOrgStore = useOrganizationStore.getState();
          const hasOrgData = currentOrgStore.organizations.length > 0;
          const isAlreadyLoading = currentOrgStore.isLoading;

          if (!hasOrgData && !isAlreadyLoading) {
            console.log('[AuthProvider] SIGNED_IN: No existing org data and not loading, fetching fresh data');
            void triggerInitialDataFetch(session);
          } else {
            console.log(
              '[AuthProvider] SIGNED_IN: Org data already present; still claiming pending invites',
              { hasOrgData, isAlreadyLoading },
            );
            void organizationApi
              .claimPendingInvites()
              .then((res) => {
                if (
                  res.data?.claimed &&
                  res.data.claimed > 0 &&
                  session.user?.id &&
                  session.access_token
                ) {
                  return fetchOrgData(session.user.id, session.access_token);
                }
              })
              .catch((e) =>
                console.warn('[AuthProvider] claim-invites on SIGNED_IN failed (non-fatal):', e),
              );
          }
        } else {
          console.warn('[AuthProvider] SIGNED_IN event received but session/token missing.');
          clearAllAppData(); // Invalid sign in, safe to clear everything
        }
      } else if (event === 'SIGNED_OUT') {
        clearAllAppData(); // Explicit sign out, clear everything
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
           setAuthCookie(session.access_token, session.expires_in);
           // Don't clear data on token refresh, just update the cookie
        } else {
           console.warn('[AuthProvider] TOKEN_REFRESHED event received but session/token missing.');
           clearAllAppData(); // Invalid token refresh, safe to clear everything
        }
      } else if (event === 'USER_UPDATED') {
        // Handle user updates if necessary (e.g., email change)
        // Don't clear forecast data for user updates
      }
      
      if (!session && event !== 'SIGNED_OUT') { 
          console.log(`[AuthProvider] Session became null unexpectedly (event: ${event}), clearing data.`);
          clearAllAppData(); // Unexpected session loss, safe to clear everything
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // New useEffect to fetch forecasts when currentOrganization changes and session is valid
  // RE-ENABLED WITH DEBUGGING
  const currentOrganization = useOrganizationStore((state) => state.currentOrganization);
  const currentOrgId = currentOrganization?.id;

  useEffect(() => {
    console.log('🔮 [AuthProvider] Forecast useEffect triggered:', {
      hasSession: !!session,
      hasUser: !!session?.user?.id,
      hasToken: !!session?.access_token,
      hasCurrentOrg: !!currentOrganization,
      currentOrgId: currentOrganization?.id,
      currentOrgName: currentOrganization?.name
    });

    const fetchForecastsForOrganization = async () => {
      const userId = session?.user?.id;
      const token = session?.access_token;
      const orgId = currentOrganization?.id;

      if (userId && token && orgId) {
        console.log('🔮 [AuthProvider] Current organization set/changed, attempting to fetch forecasts for org ID:', orgId);
        
        // Check if we're switching to a different organization or if this is the same org
        
        console.log('🔮 [AuthProvider] Forecast store state check:', {
          currentForecastOrgId,
          newOrgId: orgId,
          isDirty,
          isSameOrg: currentForecastOrgId === orgId
        });
        
        // If we're switching to a different organization, clear the forecast store
        // If it's the same organization and we have unsaved changes, preserve them
        if (currentForecastOrgId && currentForecastOrgId !== orgId) {
          console.log('🔮 [AuthProvider] Switching to different organization, clearing forecast store');
          memoizedClearForecasts();
        } else if (currentForecastOrgId === orgId && isDirty) {
          console.log('🔮 [AuthProvider] Same organization with unsaved changes, preserving forecast data');
          // Don't clear the store, just update the organization forecasts list
          memoizedSetForecastLoading(true);
          memoizedSetForecastError(null);
        } else {
          // New organization or no unsaved changes, safe to clear
          console.log('🔮 [AuthProvider] Setting forecast loading to TRUE');
          memoizedSetForecastLoading(true);
          memoizedSetForecastError(null);
        }
        
        try {
          console.log('🔮 [AuthProvider] Fetching forecasts from Supabase...');
          
          // Replace with your actual forecast API call using forecastApi if available
          // For now, using Supabase client directly as in previous attempt.
          const { data: forecastsData, error: fetchError } = await supabase
            .from('forecasts') // Placeholder, ensure this matches your schema/API
            .select('*')
            .eq('organization_id', orgId);

          console.log('🔮 [AuthProvider] Supabase forecast result:', {
            hasData: !!forecastsData,
            dataLength: forecastsData?.length || 0,
            hasError: !!fetchError,
            error: fetchError?.message
          });

          if (fetchError) {
            console.error('🔮 [AuthProvider] Error fetching organization forecasts:', fetchError.message);
            memoizedSetForecastError(fetchError.message);
            memoizedLoadOrgForecasts([]); // Load empty to reset state and set isLoading false
          } else if (forecastsData && forecastsData.length > 0) {
            const mappedForecasts = (forecastsData as Record<string, unknown>[]).map(
              mapSupabaseForecastRowToClient
            );
            memoizedLoadOrgForecasts(mappedForecasts as any);
            console.log('🔮 [AuthProvider] Organization forecasts loaded for org ID:', orgId, 'Count:', forecastsData.length);
          } else { // No error, but no data or empty array
            console.log('🔮 [AuthProvider] No forecasts found or empty array for org ID:', orgId);
            memoizedLoadOrgForecasts([]); // This sets isLoading: false
          }
        } catch (e: any) {
          console.error('🔮 [AuthProvider] Exception fetching organization forecasts:', e.message);
          memoizedSetForecastError(e.message);
          memoizedLoadOrgForecasts([]); // Ensure store is reset and isLoading is false in case of unexpected error
        }
      } else if (!orgId && session) {
        // If there's a session but no current org, clear existing forecasts
        // This handles cases like org deletion or if initial org load fails but session is active
        console.log('🔮 [AuthProvider] No current organization, clearing forecasts.');
        memoizedClearForecasts(); // This action also resets isLoading to false via initialState
      } else {
        console.log('🔮 [AuthProvider] Prerequisites not met for forecast loading:', {
          hasUserId: !!userId,
          hasToken: !!token,
          hasOrgId: !!orgId
        });
      }
    };

    if (session) { // Only attempt to fetch if there's an active session
      fetchForecastsForOrganization();
    } else {
      console.log('🔮 [AuthProvider] No session, skipping forecast fetch');
    }
  }, [session?.user?.id, session?.access_token, currentOrgId]); // Only depend on primitive values, not store functions

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 [AuthProvider] Starting signIn for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      console.log('🔐 [AuthProvider] SignIn result:', {
        hasError: !!error,
        hasSession: !!data.session,
        hasUser: !!data.user,
        errorMessage: error?.message
      });
      
      if (!error && data.session) {
        console.log('🔐 [AuthProvider] Authentication successful, redirecting to home');
        // Use router.push instead of window.location.href for better SPA behavior
        router.push('/');
      } else if (error) {
        console.error('🔐 [AuthProvider] Sign in error:', error);
      }
      
      return { error };
    } catch (err) {
      console.error('🔐 [AuthProvider] Sign in exception:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      // Some Supabase instances require email confirmation
      const confirmationSent = !error && !data.session;
      
      if (!error && data.session) {
        window.location.href = '/';
      } else if (error) {
        console.error('Sign up error:', error);
      }
      
      return { error, confirmationSent };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/landing';
    } catch (err) {
      console.error('Sign out error:', err);
      clearAllAppData(); 
      window.location.href = '/landing';
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 