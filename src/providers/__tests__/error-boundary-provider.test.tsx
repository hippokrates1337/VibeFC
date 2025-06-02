import React from 'react';
import { renderWithoutErrorBoundary as render, screen } from '@/test-utils';
import { ErrorBoundaryProvider } from '../error-boundary-provider';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundaryProvider', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundaryProvider>
        <ThrowError shouldThrow={false} />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error fallback when child component throws', () => {
    render(
      <ErrorBoundaryProvider>
        <ThrowError shouldThrow={true} />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please refresh the page or try again later.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundaryProvider fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should log error to console when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundaryProvider>
        <ThrowError shouldThrow={true} />
      </ErrorBoundaryProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
}); 