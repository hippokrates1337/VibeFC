import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { useVariableStore } from '@/lib/store/variables';
import { Database } from 'lucide-react';

/**
 * DataNode displays a variable and offset.
 */
const DataNode: React.FC<NodeProps> = ({ data, selected }) => {
  const variables = useVariableStore((state) => state.variables);
  const variable = variables.find(v => v.id === data?.variableId);
  const displayName = variable?.name || data?.variableId || '-';

  return (
    <div className={`relative bg-slate-800 border-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-48 ${
      selected ? 'border-blue-500 ring-2 ring-blue-400/20' : 'border-slate-600 hover:border-blue-400'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-t-md">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{data?.name || 'Data Node'}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-slate-300">
          <span className="font-medium">Variable:</span>
          <div className="font-mono text-slate-100 mt-1 p-1 bg-slate-700 rounded text-xs truncate border border-slate-600" title={displayName}>
            {displayName}
          </div>
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-medium">Offset:</span>
          <span className="ml-1 font-mono text-slate-100 bg-slate-700 px-1 py-0.5 rounded border border-slate-600">
            {data?.offsetMonths ?? 0}
          </span>
          <span className="ml-1">months</span>
        </div>
      </div>
      
      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-blue-500 hover:!bg-blue-600 transition-colors"
        style={{ top: -8 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 !border-slate-800 !bg-blue-500 hover:!bg-blue-600 transition-colors"
        style={{ bottom: -8 }}
      />
    </div>
  );
};

export default DataNode; 