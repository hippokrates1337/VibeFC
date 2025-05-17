import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

/**
 * MetricNode displays label, budgetVariableId, and historicalVariableId.
 */
const MetricNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="rounded-md border-2 border-purple-500 bg-purple-50 p-2 min-w-[120px] shadow">
      <div className="font-semibold text-purple-700">Metric</div>
      <div className="text-xs text-purple-900 mt-1">
        Label: <span className="font-mono">{data?.label || '-'}</span>
      </div>
      <div className="text-xs text-purple-900">
        Budget: <span className="font-mono">{data?.budgetVariableId || '-'}</span>
      </div>
      <div className="text-xs text-purple-900">
        Historical: <span className="font-mono">{data?.historicalVariableId || '-'}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default MetricNode; 