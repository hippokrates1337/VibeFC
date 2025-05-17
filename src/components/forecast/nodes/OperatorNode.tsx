import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

/**
 * OperatorNode displays the operator and input order.
 */
const OperatorNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="rounded-md border-2 border-yellow-500 bg-yellow-50 p-2 min-w-[100px] shadow">
      <div className="font-semibold text-yellow-700">Operator</div>
      <div className="text-xs text-yellow-900 mt-1">
        Op: <span className="font-mono">{data?.op || '-'}</span>
      </div>
      <div className="text-xs text-yellow-900">
        Inputs: <span className="font-mono">{Array.isArray(data?.inputOrder) ? data.inputOrder.join(', ') : '-'}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default OperatorNode; 