import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { useVariableStore } from '@/lib/store/variables';

/**
 * DataNode displays a variable and offset.
 */
const DataNode: React.FC<NodeProps> = ({ data }) => {
  const variables = useVariableStore((state) => state.variables);
  const variable = variables.find(v => v.id === data?.variableId);
  const displayName = variable?.name || data?.variableId || '-';

  return (
    <div className="rounded-md border-2 border-blue-500 bg-blue-50 p-2 w-48 shadow">
      <div className="font-semibold text-blue-700 truncate">{data?.name || 'Data Node'}</div>
      <div className="text-xs text-blue-900 mt-1 flex items-baseline">
        <span className="flex-shrink-0 mr-1">Variable:</span>
        <span className="font-mono truncate">{displayName}</span>
      </div>
      <div className="text-xs text-blue-900">
        Offset: <span className="font-mono">{data?.offsetMonths ?? 0}</span> months
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default DataNode; 