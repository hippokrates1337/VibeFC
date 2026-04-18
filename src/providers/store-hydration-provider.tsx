'use client';

import { useEffect } from 'react';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';

interface StoreHydrationProviderProps {
  children: React.ReactNode;
}

/**
 * Provider to handle Zustand store hydration for SSR compatibility
 * Ensures stores are properly hydrated before components render
 */
export function StoreHydrationProvider({ children }: StoreHydrationProviderProps) {
  useEffect(() => {
    // Initialize store hydration on app startup
    if (typeof window !== 'undefined') {
      console.log('🔄 Initializing store hydration...');
      
      // Rehydrate forecast graph store (rehydrate may return void or Promise<void>)
      Promise.resolve(useForecastGraphStore.persist.rehydrate())
        .then(() => {
          console.log('✅ Forecast graph store hydrated');
          // Set hydration flag after successful rehydration
          useForecastGraphStore.getState()._setHasHydrated(true);
        })
        .catch((error: unknown) => {
          console.error('❌ Failed to hydrate forecast graph store:', error);
          // Still set hydration flag to prevent infinite loading
          useForecastGraphStore.getState()._setHasHydrated(true);
        });
    }
  }, []);

  return <>{children}</>;
}
