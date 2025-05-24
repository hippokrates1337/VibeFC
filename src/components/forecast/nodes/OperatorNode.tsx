import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { Calculator } from 'lucide-react';

/**
 * OperatorNode displays the operator and input order.
 */
const OperatorNode: React.FC<NodeProps> = ({ data, selected }) => {
  const inputCount = Array.isArray(data?.inputOrder) ? data.inputOrder.length : 0;
  
  return (
    <div className={`relative bg-slate-800 border-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-44 ${
      selected ? 'border-yellow-500 ring-2 ring-yellow-400/20' : 'border-slate-600 hover:border-yellow-400'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-sm">Operator</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-slate-300">
          <span className="font-medium">Operation:</span>
          <div className="font-mono text-slate-100 mt-1 p-2 bg-slate-700 rounded text-lg text-center border border-slate-600 font-bold">
            {data?.op || '-'}
          </div>
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-medium">Inputs:</span>
          <span className="ml-1 text-slate-100 bg-slate-700 px-1 py-0.5 rounded border border-slate-600">
            {inputCount} connected
          </span>
        </div>
      </div>
      
      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-yellow-500 hover:!bg-yellow-600 transition-colors"
        style={{ top: -8 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-yellow-500 hover:!bg-yellow-600 transition-colors"
        style={{ bottom: -8 }}
      />
    </div>
  );
};

export default OperatorNode; 