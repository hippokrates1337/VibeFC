import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundaryProvider } from '@/providers/error-boundary-provider';

// A fresh query cache per rendered tree, without retries
const QueryProviders = ({ children }: { children: React.ReactNode }) => {
  const [client] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// Custom render function that includes ErrorBoundaryProvider and the query cache
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundaryProvider>
      <QueryProviders>{children}</QueryProviders>
    </ErrorBoundaryProvider>
  );
};

const renderWithErrorBoundary = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllTheProviders, ...options });

const renderWithoutErrorBoundary = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: QueryProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Export both render methods
export { renderWithErrorBoundary as render };
export { renderWithoutErrorBoundary }; 