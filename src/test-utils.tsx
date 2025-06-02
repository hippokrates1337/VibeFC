import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ErrorBoundaryProvider } from '@/providers/error-boundary-provider';

// Custom render function that includes ErrorBoundaryProvider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundaryProvider>
      {children}
    </ErrorBoundaryProvider>
  );
};

const renderWithErrorBoundary = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Export both render methods
export { renderWithErrorBoundary as render };
export { rtlRender as renderWithoutErrorBoundary }; 