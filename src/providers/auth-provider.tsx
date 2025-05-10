'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useOrganizationStore } from '@/lib/store/organization';
import { useVariableStore } from '@/lib/store/variables';

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

  const fetchOrgData = useOrganizationStore.getState().fetchOrganizationData;
  const clearOrgData = useOrganizationStore.getState().clearOrganizationData;
  const fetchVars = useVariableStore.getState().fetchVariables;
  const clearVars = useVariableStore.getState().clearVariables;

  const triggerInitialDataFetch = useCallback((session: Session | null) => {
    const userId = session?.user?.id;
    const token = session?.access_token;

    if (userId && token) {
      console.log('[AuthProvider] Valid session detected, fetching initial data for user:', userId);
      fetchOrgData(userId, token);
      fetchVars(userId, token);
    } else {
      console.log('[AuthProvider] No valid session/user/token, skipping initial data fetch.');
    }
  }, [fetchOrgData, fetchVars]);

  const clearAllAppData = useCallback(() => {
    console.log('[AuthProvider] Clearing all app data (stores and localStorage)...');
    clearOrgData();
    clearVars();
    localStorage.removeItem('currentOrganizationId');
    removeAuthCookie();
  }, [clearOrgData, clearVars]);

  // Store token in cookie
  const setAuthCookie = (token: string, expiresIn: number) => {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + expiresIn);
    document.cookie = `sb-access-token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
  };

  // Remove auth cookie
  const removeAuthCookie = () => {
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'redirect_count=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
      
      if (initialSession?.access_token) {
        setAuthCookie(initialSession.access_token, initialSession.expires_in);
        triggerInitialDataFetch(initialSession);
      } else {
        clearAllAppData();
      }
    }).catch(err => {
      console.error('[AuthProvider] Error getting initial session:', err);
      setIsLoading(false);
      clearAllAppData();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state change event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        if (session?.access_token) {
          setAuthCookie(session.access_token, session.expires_in);
          triggerInitialDataFetch(session);
        } else {
          console.warn('[AuthProvider] SIGNED_IN event received but session/token missing.');
          clearAllAppData();
        }
      } else if (event === 'SIGNED_OUT') {
        clearAllAppData();
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
           setAuthCookie(session.access_token, session.expires_in);
        } else {
           console.warn('[AuthProvider] TOKEN_REFRESHED event received but session/token missing.');
           clearAllAppData();
        }
      } else if (event === 'USER_UPDATED') {
        // Handle user updates if necessary (e.g., email change)
        // Might need to refetch some data depending on the app logic
      }
      
      if (!session && event !== 'SIGNED_OUT') { 
          console.log(`[AuthProvider] Session became null unexpectedly (event: ${event}), clearing data.`);
          clearAllAppData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (!error && data.session) {
        window.location.href = '/';
      } else if (error) {
        console.error('Sign in error:', error);
      }
      
      return { error };
    } catch (err) {
      console.error('Sign in error:', err);
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
      window.location.href = '/login';
    } catch (err) {
      console.error('Sign out error:', err);
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