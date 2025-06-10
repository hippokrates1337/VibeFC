'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useCalculationResults, useForecastId, useForecastOrganizationId } from '@/lib/store/forecast-graph-store';

interface CalculationResultsDisplayProps {
  metricNodeId?: string; // If specified, show only this metric
  showControls?: boolean;
  compact?: boolean;
}

/**
 * Component for displaying forecast calculation results
 */
export function CalculationResultsDisplay({ 
  metricNodeId, 
  showControls = true,
  compact = false
}: CalculationResultsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const forecastId = useForecastId();
  const organizationId = useForecastOrganizationId();
  
  const calculationResults = useCalculationResults();

  if (!calculationResults) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Calculation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No calculation results available</p>
            <p className="text-sm mt-2">Calculate the forecast to see results here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricsToShow = metricNodeId 
    ? calculationResults.metrics.filter(m => m.metricNodeId === metricNodeId)
    : calculationResults.metrics;

  const handleExportResults = () => {
    // Create CSV content
    const headers = ['Metric', 'Date', 'Forecast', 'Budget', 'Historical'];
    const rows = metricsToShow.flatMap(metric => 
      metric.values.map(value => [
        metric.metricNodeId,
        value.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        value.forecast?.toString() ?? 'null',
        value.budget?.toString() ?? 'null',
        value.historical?.toString() ?? 'null'
      ])
    );
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forecast-calculation-results-${forecastId || 'unknown'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[CalculationResults] Results exported to CSV');
  };

  if (compact && !isExpanded) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-200">Results</CardTitle>
            <Button
              onClick={() => setIsExpanded(true)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-slate-400">
            {metricsToShow.length} metrics calculated
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-200">Calculation Results</CardTitle>
          {showControls && (
            <div className="flex items-center gap-2">
              {compact && (
                <Button
                  onClick={() => setIsExpanded(false)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-200"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={handleExportResults}
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          )}
        </div>
        <div className="text-sm text-slate-400">
          Calculated: {new Date(calculationResults.calculatedAt).toLocaleString()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metricsToShow.map(metric => (
            <div key={metric.metricNodeId} className="border border-slate-600 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-200">
                  Metric: {metric.metricNodeId}
                </h4>
                <span className="text-xs px-2 py-1 rounded border bg-slate-700 text-slate-300 border-slate-600">
                  {metric.values.length} months
                </span>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-4 gap-4 text-xs font-medium text-slate-300 border-b border-slate-600 pb-2">
                  <div>Date</div>
                  <div>Forecast</div>
                  <div>Budget</div>
                  <div>Historical</div>
                </div>
                {metric.values.map((value, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-slate-400">
                      {new Date(value.date).toLocaleDateString()}
                    </div>
                    <div className="text-blue-400">
                      {value.forecast !== null ? value.forecast.toFixed(2) : 'N/A'}
                    </div>
                    <div className="text-green-400">
                      {value.budget !== null ? value.budget.toFixed(2) : 'N/A'}
                    </div>
                    <div className="text-yellow-400">
                      {value.historical !== null ? value.historical.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 