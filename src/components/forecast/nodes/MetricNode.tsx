import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { useVariableStore } from '@/lib/store/variables';
import { BarChart3, Calculator, Database } from 'lucide-react';
import { useSelectedVisualizationMonth, useShowVisualizationSlider, useGetNodeValueForMonth } from '@/lib/store/forecast-graph-store';
import NodeValueOverlay from '../node-value-overlay';

/**
 * MetricNode displays label, budgetVariableId, and historicalVariableId.
 */
const MetricNode: React.FC<NodeProps> = ({ data, selected, id }) => {
  const variables = useVariableStore((state) => state.variables);
  const budgetVariable = variables.find(v => v.id === data?.budgetVariableId);
  const historicalVariable = variables.find(v => v.id === data?.historicalVariableId);
  
  const budgetDisplayName = budgetVariable?.name || data?.budgetVariableId || '-';
  const historicalDisplayName = historicalVariable?.name || data?.historicalVariableId || '-';
  const isCalculated = data?.useCalculated ?? false;

  // Visualization state
  const selectedMonth = useSelectedVisualizationMonth();
  const showSlider = useShowVisualizationSlider();
  const getNodeValueForMonth = useGetNodeValueForMonth();

  // Get node value for visualization
  const nodeValue = React.useMemo(() => {
    if (!selectedMonth || !showSlider || !id) return null;
    return getNodeValueForMonth(id, selectedMonth);
  }, [selectedMonth, showSlider, id, getNodeValueForMonth]);

  return (
    <div className={`relative bg-slate-800 border-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-52 ${
      selected ? 'border-purple-500 ring-2 ring-purple-400/20' : 'border-slate-600 hover:border-purple-400'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-sm">Metric</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-slate-300">
          <span className="font-medium">Label:</span>
          <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={data?.label || '-'}>
            {data?.label || '-'}
          </div>
        </div>
        
        <div className="text-xs text-slate-300">
          <span className="font-medium">Mode:</span>
          <div className={`font-mono mt-1 p-1 rounded text-xs truncate border ${
            isCalculated 
              ? 'text-orange-300 bg-orange-900/20 border-orange-600' 
              : 'text-blue-300 bg-blue-900/20 border-blue-600'
          }`}>
            {isCalculated ? 'Calculated' : 'Variable'}
          </div>
        </div>
        
        {!isCalculated && (
          <>
            <div className="text-xs text-slate-300">
              <span className="font-medium">Budget:</span>
              <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={budgetDisplayName}>
                {budgetDisplayName}
              </div>
            </div>
            <div className="text-xs text-slate-300">
              <span className="font-medium">Historical:</span>
              <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={historicalDisplayName}>
                {historicalDisplayName}
              </div>
            </div>
          </>
        )}
        
        {isCalculated && (
          <div className="text-xs text-slate-400 italic text-center py-2">
            Calculated from connected nodes
          </div>
        )}
      </div>
      
      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-purple-500 hover:!bg-purple-600 transition-colors"
        style={{ top: -8 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-purple-500 hover:!bg-purple-600 transition-colors"
        style={{ bottom: -8 }}
      />
      
      {/* Visualization overlay */}
      {showSlider && nodeValue && (
        <NodeValueOverlay 
          nodeId={id || ''}
          value={nodeValue}
          nodeType="METRIC"
          position="bottom-right"
          compact={true}
        />
      )}
    </div>
  );
};

export default MetricNode; 