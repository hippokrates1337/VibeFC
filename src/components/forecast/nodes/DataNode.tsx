import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

/**
 * DataNode displays a variable and offset.
 */
const DataNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="rounded-md border-2 border-blue-500 bg-blue-50 p-2 min-w-[120px] shadow">
      <div className="font-semibold text-blue-700">Data Node</div>
      <div className="text-xs text-blue-900 mt-1">
        Variable: <span className="font-mono">{data?.variableId || '-'}</span>
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