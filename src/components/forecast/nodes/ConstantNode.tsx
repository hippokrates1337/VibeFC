import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

/**
 * ConstantNode displays a constant value.
 */
const ConstantNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="rounded-md border-2 border-green-500 bg-green-50 p-2 min-w-[100px] shadow">
      <div className="font-semibold text-green-700">Constant</div>
      <div className="text-xs text-green-900 mt-1">
        Value: <span className="font-mono">{data?.value ?? '-'}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default ConstantNode; 