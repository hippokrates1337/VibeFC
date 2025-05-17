import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

/**
 * SeedNode displays the sourceMetricId.
 */
const SeedNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="rounded-md border-2 border-pink-500 bg-pink-50 p-2 min-w-[100px] shadow">
      <div className="font-semibold text-pink-700">Seed</div>
      <div className="text-xs text-pink-900 mt-1">
        Source Metric: <span className="font-mono">{data?.sourceMetricId || '-'}</span>
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default SeedNode; 