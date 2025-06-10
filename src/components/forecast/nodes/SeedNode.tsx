import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { Flame } from 'lucide-react';
import { useForecastGraphStore, MetricNodeAttributes } from '@/lib/store/forecast-graph-store';

/**
 * SeedNode displays the sourceMetricId and resolves it to the metric node's label.
 */
const SeedNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodes = useForecastGraphStore(state => state.nodes);
  
  // Find the connected metric node and display its label
  const getDisplayName = () => {
    const sourceMetricId = data?.sourceMetricId;
    if (!sourceMetricId) return '-';
    
    // Find the metric node by ID
    const metricNode = nodes.find(node => node.id === sourceMetricId && node.type === 'METRIC');
    if (metricNode) {
      const metricData = metricNode.data as MetricNodeAttributes;
      return metricData?.label || `Metric ${sourceMetricId.slice(0, 8)}...`;
    }
    
    // If no metric node found, display the ID (fallback)
    return sourceMetricId.slice(0, 8) + '...';
  };
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
            {getDisplayName()}
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