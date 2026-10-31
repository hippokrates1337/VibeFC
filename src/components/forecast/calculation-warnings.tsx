'use client';

import { AlertTriangle } from 'lucide-react';
import type { CalculationWarning } from '@/types/forecast';
import type { ForecastNodeClient } from '@/lib/store/forecast-graph-store/types';
import { getNodeDisplayName } from '@/lib/utils/forecast-hierarchy';

interface CalculationWarningsProps {
  readonly warnings: readonly CalculationWarning[] | undefined;
  /** The forecast's nodes, to name the nodes a warning is about. */
  readonly nodes: readonly ForecastNodeClient[];
}

/** One line per warning. The engine names nodes in its messages, except for missing variables. */
export function describeWarning(warning: CalculationWarning, nodes: readonly ForecastNodeClient[]): string {
  if (warning.code !== 'VARIABLE_NOT_FOUND') {
    return warning.message;
  }
  const names = warning.nodeIds.map((id) => {
    const node = nodes.find((n) => n.id === id);
    return node ? `"${getNodeDisplayName(node)}"` : 'a removed node';
  });
  return `${names.join(', ')} ${names.length === 1 ? 'uses a variable that no longer exists' : 'use a variable that no longer exists'}; values that depend on it are empty.`;
}

/** The warnings of the last calculation: what left values empty or unexpected. */
export function CalculationWarnings({ warnings, nodes }: CalculationWarningsProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div role="status" className="p-3 bg-amber-900/40 border border-amber-700 rounded text-amber-100 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
        <div>
          <div className="font-medium">
            {warnings.length === 1 ? '1 warning' : `${warnings.length} warnings`}: some values may be empty or unexpected
          </div>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>{describeWarning(warning, nodes)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
