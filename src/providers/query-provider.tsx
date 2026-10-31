'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** A query client for one browser tab: server lists are cached in memory only. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Browser storage keys of earlier versions that cached server data (variables, the forecast graph). */
const LEGACY_STORAGE_KEYS = ['variable-storage', 'forecast-graph-store'];

/** Server data (forecast lists, variables) is loaded with TanStack Query, keyed by organization. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  // Drop what earlier versions cached, so no stale copy outlives this version
  useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Storage can be unavailable (private mode); nothing to clean then
    }
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
