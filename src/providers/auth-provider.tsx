'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganizationStore } from '@/lib/store/organization';
import { useForecastGraphActions } from '@/lib/store/forecast-graph-store/hooks';
import { organizationApi } from '@/lib/api-client';
import { logger } from '@/lib/utils/logger';

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
  const queryClient = useQueryClient();

  const fetchOrgData = useOrganizationStore.getState().fetchOrganizationData;
  const clearOrgData = useOrganizationStore.getState().clearOrganizationData;
  
  // Safe destructuring with fallbacks to prevent undefined function references
  const forecastActions = useForecastGraphActions();
  const clearForecasts = forecastActions?.resetStore || (() => {});

  const triggerInitialDataFetch = useCallback(async (session: Session | null) => {
    const userId = session?.user?.id;
    const token = session?.access_token;

    if (userId && token) {
      try {
        await organizationApi.claimPendingInvites();
      } catch (e) {
        logger.warn('auth.claim-invites.failed', {
          reason: e instanceof Error ? e.message : 'unknown',
        });
      }
      fetchOrgData(userId, token);
    }
  }, [fetchOrgData]);

  const clearAllAppData = useCallback(() => {
    queryClient.clear();
    clearOrgData();
    clearForecasts();
    localStorage.removeItem('currentOrganizationId');
    removeAuthCookie();
  }, [queryClient, clearOrgData, clearForecasts]);

  // Store token in cookie
  const setAuthCookie = (token: string, expiresIn: number) => {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + expiresIn);
    const cookieValue = `sb-access-token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    document.cookie = cookieValue;
  };

  // Remove auth cookie
  const removeAuthCookie = () => {
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'redirect_count=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
      
      if (initialSession?.access_token) {
        setAuthCookie(initialSession.access_token, initialSession.expires_in);
        triggerInitialDataFetch(initialSession);
      } else {
        clearAllAppData(); // No session, safe to clear everything
      }
    }).catch(err => {
      logger.error('auth.session.initial-fetch-failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      setIsLoading(false);
      clearAllAppData(); // Error case, safe to clear everything
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        if (session?.access_token) {
          setAuthCookie(session.access_token, session.expires_in);

          const currentOrgStore = useOrganizationStore.getState();
          const hasOrgData = currentOrgStore.organizations.length > 0;
          const isAlreadyLoading = currentOrgStore.isLoading;

          if (!hasOrgData && !isAlreadyLoading) {
            void triggerInitialDataFetch(session);
          } else {
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
                logger.warn('auth.claim-invites.signed-in-failed', {
                  reason: e instanceof Error ? e.message : 'unknown',
                }),
              );
          }
        } else {
          logger.warn('auth.signed-in-without-session');
          clearAllAppData(); // Invalid sign in, safe to clear everything
        }
      } else if (event === 'SIGNED_OUT') {
        clearAllAppData(); // Explicit sign out, clear everything
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
           setAuthCookie(session.access_token, session.expires_in);
           // Don't clear data on token refresh, just update the cookie
        } else {
           logger.warn('auth.token-refresh-without-session');
           clearAllAppData(); // Invalid token refresh, safe to clear everything
        }
      } else if (event === 'USER_UPDATED') {
        // Handle user updates if necessary (e.g., email change)
        // Don't clear forecast data for user updates
      }
      
      if (!session && event !== 'SIGNED_OUT') {
          logger.warn('auth.session-unexpected-null', { event });
          clearAllAppData(); // Unexpected session loss, safe to clear everything
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      // The caller navigates (LoginForm goes back to returnTo)
      if (error) {
        logger.error('auth.sign-in.failed', { reason: error.message });
      }
      
      return { error };
    } catch (err) {
      logger.error('auth.sign-in.exception', { reason: err instanceof Error ? err.message : 'unknown' });
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
        logger.error('auth.sign-up.failed', { reason: error.message });
      }
      
      return { error, confirmationSent };
    } catch (err) {
      logger.error('auth.sign-up.exception', { reason: err instanceof Error ? err.message : 'unknown' });
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      logger.error('auth.sign-out.failed', { reason: err instanceof Error ? err.message : 'unknown' });
      clearAllAppData(); 
      window.location.href = '/login';
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