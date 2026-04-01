'use client';

import { useCalculations, useForecastGraph } from '@/lib/store/forecast-graph-store/hooks';
import { MetricNodeAttributes } from '@/lib/store/forecast-graph-store/types';

/**
 * Simple scrollable table for displaying calculation results (interim solution)
 * This component provides a straightforward, readable format for each metric and month
 */
export function CalculationResultsTable() {
  const { calculationResults } = useCalculations();
  const { nodes } = useForecastGraph();

  if (!calculationResults) {
    return null;
  }

  // Helper function to format numbers with thousand separators
  const formatNumber = (value: number | null): string => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper function to format dates as MM-YYYY
  const formatDate = (dateValue: string | Date): string => {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${year}`;
  };

  // Helper function to get metric name from node ID
  const getMetricName = (metricNodeId: string): string => {
    const metricNode = nodes.find(node => node.id === metricNodeId && node.type === 'METRIC');
    if (metricNode) {
      const metricData = metricNode.data as MetricNodeAttributes;
      return metricData?.label || metricNodeId;
    }
    return metricNodeId;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Calculation Results</h3>
      <div className="text-sm text-slate-400 mb-3">
        Calculated: {new Date(calculationResults.calculatedAt).toLocaleString()}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left py-2 px-3 text-slate-300 font-medium">Metric</th>
              <th className="text-left py-2 px-3 text-slate-300 font-medium">Month</th>
              <th className="text-right py-2 px-3 text-slate-300 font-medium">Forecast</th>
              <th className="text-right py-2 px-3 text-slate-300 font-medium">Budget</th>
              <th className="text-right py-2 px-3 text-slate-300 font-medium">Historical</th>
            </tr>
          </thead>
          <tbody>
            {calculationResults.metrics.map((metric: any) =>
              metric.values.map((value: any, index: number) => (
                <tr 
                  key={`${metric.nodeId}-${index}`} 
                  className="border-b border-slate-700 hover:bg-slate-750"
                >
                  <td className="py-2 px-3 text-slate-200">
                    {index === 0 ? getMetricName(metric.nodeId) : ''}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {value.month}
                  </td>
                  <td className="py-2 px-3 text-right text-blue-400 font-mono">
                    {formatNumber(value.forecast)}
                  </td>
                  <td className="py-2 px-3 text-right text-green-400 font-mono">
                    {formatNumber(value.budget)}
                  </td>
                  <td className="py-2 px-3 text-right text-yellow-400 font-mono">
                    {formatNumber(value.historical)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 