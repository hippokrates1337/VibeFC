'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useGraphValidation, useIsValidatingGraph } from '@/lib/store/forecast-graph-store';

interface GraphValidationDisplayProps {
  onValidate: () => Promise<void>;
  compact?: boolean;
}

/**
 * Component for displaying graph validation status and providing validation controls
 */
export function GraphValidationDisplay({ onValidate, compact = false }: GraphValidationDisplayProps) {
  const graphValidation = useGraphValidation();
  const isValidating = useIsValidatingGraph();

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (!graphValidation) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    
    return graphValidation.isValid 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getValidationStatus = () => {
    if (isValidating) return 'Validating...';
    if (!graphValidation) return 'Not validated';
    return graphValidation.isValid ? 'Valid' : 'Invalid';
  };

  const getValidationBadgeClass = () => {
    if (isValidating) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (!graphValidation) return 'bg-gray-100 text-gray-800 border-gray-200';
    return graphValidation.isValid 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getValidationIcon()}
            <span className="text-sm text-slate-200">{getValidationStatus()}</span>
          </div>
          <Button
            onClick={onValidate}
            disabled={isValidating}
            variant="outline"
            size="sm"
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {graphValidation && !graphValidation.isValid && (
          <div className="space-y-1">
            <div className="text-xs text-red-400">
              {graphValidation.errors.length} error(s) found:
            </div>
            {graphValidation.errors.map((error, index) => (
              <div key={index} className="text-xs text-red-300 bg-red-950/20 p-2 rounded border border-red-500/20">
                {error}
              </div>
            ))}
          </div>
        )}
        
        {graphValidation && graphValidation.warnings.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-yellow-400">
              {graphValidation.warnings.length} warning(s) found:
            </div>
            {graphValidation.warnings.map((warning, index) => (
              <div key={index} className="text-xs text-yellow-300 bg-yellow-950/20 p-2 rounded border border-yellow-500/20">
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-slate-200">Graph Validation</CardTitle>
          <span className={`text-xs px-2 py-1 rounded border ${getValidationBadgeClass()}`}>
            {getValidationStatus()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={onValidate}
          disabled={isValidating}
          variant="outline"
          size="sm"
          className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Validate Graph
            </>
          )}
        </Button>

        {graphValidation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getValidationIcon()}
              <span className="text-sm text-slate-200">
                {graphValidation.isValid ? 'Graph is valid' : `${graphValidation.errors.length} errors found`}
              </span>
            </div>

            {graphValidation.errors.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-red-400">Errors:</h4>
                {graphValidation.errors.map((error, index) => (
                  <div key={index} className="text-xs text-red-300 bg-red-950/20 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            )}

            {graphValidation.warnings.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-yellow-400">Warnings:</h4>
                {graphValidation.warnings.map((warning, index) => (
                  <div key={index} className="text-xs text-yellow-300 bg-yellow-950/20 p-2 rounded">
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 