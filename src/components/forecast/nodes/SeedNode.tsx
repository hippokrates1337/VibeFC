import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { Flame } from 'lucide-react';

/**
 * SeedNode displays the sourceMetricId.
 */
const SeedNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`relative bg-slate-800 border-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-44 ${
      selected ? 'border-pink-500 ring-2 ring-pink-400/20' : 'border-slate-600 hover:border-pink-400'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-3 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-sm">Seed</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <div className="text-xs text-slate-300">
          <span className="font-medium">Source Metric:</span>
          <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={data?.sourceMetricId || '-'}>
            {data?.sourceMetricId || '-'}
          </div>
        </div>
      </div>
      
      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-pink-500 hover:!bg-pink-600 transition-colors"
        style={{ top: -8 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-pink-500 hover:!bg-pink-600 transition-colors"
        style={{ bottom: -8 }}
      />
    </div>
  );
};

export default SeedNode; 