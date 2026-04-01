import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { Pencil } from 'lucide-react';

/**
 * ConstantNode displays a constant value with a label.
 */
const ConstantNode: React.FC<NodeProps> = ({ data, selected, id }) => {
  // REMOVED: Visualization state for constant nodes - they don't need month-based visualization
  // Constants have fixed values and don't participate in forecast calculations
  return (
    <div className={`relative bg-slate-800 border-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-48 ${
      selected ? 'border-green-500 ring-2 ring-green-400/20' : 'border-slate-600 hover:border-green-400'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{data?.name || 'Constant'}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <div className="text-xs text-slate-300">
          <span className="font-medium">Value:</span>
          <div className="font-mono text-slate-100 mt-1 p-2 bg-slate-700 rounded text-sm text-center border border-slate-600 truncate" title={String(data?.value ?? '-')}>
            {data?.value ?? '-'}
          </div>
        </div>
      </div>
      
      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-green-500 hover:!bg-green-600 transition-colors"
        style={{ top: -8 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-green-500 hover:!bg-green-600 transition-colors"
        style={{ bottom: -8 }}
      />
      
      {/* REMOVED: No visualization overlay for constant nodes */}
      {/* Constants have fixed values and don't need month-based visualization */}
    </div>
  );
};

export default ConstantNode; 