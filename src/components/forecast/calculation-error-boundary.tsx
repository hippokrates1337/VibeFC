'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CalculationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface CalculationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

/**
 * Error boundary specifically for calculation-related UI components
 */
export class CalculationErrorBoundary extends React.Component<
  CalculationErrorBoundaryProps,
  CalculationErrorBoundaryState
> {
  constructor(props: CalculationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CalculationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CalculationErrorBoundary] Calculation UI error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent } = this.props;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <Card className="bg-slate-800 border-slate-700 border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Calculation UI Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-slate-300 text-sm">
              An error occurred in the calculation interface. This may be due to:
            </div>
            <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
              <li>Invalid graph configuration</li>
              <li>Network connectivity issues</li>
              <li>Temporary backend problems</li>
            </ul>
            {this.state.error && (
              <div className="bg-red-950/20 border border-red-500/20 rounded p-3">
                <div className="text-red-400 text-xs font-mono">
                  {this.state.error.message}
                </div>
              </div>
            )}
            <Button
              onClick={this.resetError}
              variant="outline"
              size="sm"
              className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
export function CalculationErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded p-4">
      <div className="flex items-center gap-2 text-red-800 mb-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">Calculation Error</span>
      </div>
      <div className="text-red-700 text-sm mb-3">
        {error.message}
      </div>
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  );
} 