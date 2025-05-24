import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { BarChart3 } from 'lucide-react';

/**
 * MetricNode displays label, budgetVariableId, and historicalVariableId.
 */
const MetricNode: React.FC<NodeProps> = ({ data, selected }) => {
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
          <span className="font-medium">Budget:</span>
          <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={data?.budgetVariableId || '-'}>
            {data?.budgetVariableId || '-'}
          </div>
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-medium">Historical:</span>
          <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={data?.historicalVariableId || '-'}>
            {data?.historicalVariableId || '-'}
          </div>
        </div>
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
    </div>
  );
};

export default MetricNode; 