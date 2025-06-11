'use client';

import React from 'react';
import { NodeVisualizationValue } from '@/types/forecast';
import { ForecastNodeKind } from '@/lib/store/forecast-graph-store';

interface NodeValueOverlayProps {
  nodeId: string;
  value: NodeVisualizationValue | null;
  nodeType?: ForecastNodeKind;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  compact?: boolean;
}

const NodeValueOverlay: React.FC<NodeValueOverlayProps> = ({
  nodeId,
  value,
  nodeType,
  position = 'top-right',
  compact = true
}) => {
  if (!value || value.value === null) return null;

  const displayValue = value.value;
  const valueType = value.valueType;
  
  // Standardized US formatting: whole numbers with thousand separators
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0, // Always whole numbers
    useGrouping: true // Thousand separators
  }).format(Math.round(displayValue));

  // Color coding based on node type to match node styling
  const getNodeTypeStyles = (nodeType?: ForecastNodeKind) => {
    switch (nodeType) {
      case 'DATA':
        return 'bg-blue-900/90 border-blue-600/50 text-blue-200'; // Blue to match DataNode
      case 'OPERATOR':
        return 'bg-yellow-900/90 border-yellow-600/50 text-yellow-200'; // Yellow to match OperatorNode
      case 'METRIC':
        return 'bg-purple-900/90 border-purple-600/50 text-purple-200'; // Purple to match MetricNode
      case 'SEED':
        return 'bg-pink-900/90 border-pink-600/50 text-pink-200'; // Pink to match SeedNode
      case 'CONSTANT':
        return 'bg-slate-700/90 border-slate-600/50 text-slate-300'; // Fallback (not used in visualization)
      default:
        // Fallback to value type if nodeType not provided (backward compatibility)
        return valueType === 'calculated' 
          ? 'bg-purple-900/90 border-purple-600/50 text-purple-200' 
          : 'bg-blue-900/90 border-blue-600/50 text-blue-200';
    }
  };

  // Position styles
  const getPositionStyles = (pos: typeof position) => {
    switch (pos) {
      case 'top-right':
        return 'absolute -top-2 -right-2';
      case 'bottom-right':
        return 'absolute -bottom-2 -right-2';
      case 'top-left':
        return 'absolute -top-2 -left-2';
      case 'bottom-left':
        return 'absolute -bottom-2 -left-2';
      default:
        return 'absolute -top-2 -right-2';
    }
  };

  return (
    <div
      className={`
        ${getPositionStyles(position)}
        ${getNodeTypeStyles(nodeType)}
        px-2 py-1 
        rounded-md 
        border 
        shadow-lg 
        backdrop-blur-sm
        text-xs 
        font-medium
        whitespace-nowrap
        transition-all 
        duration-200
        hover:scale-105
        z-10
        pointer-events-none
      `}
      title={`${valueType}: ${displayValue.toLocaleString('de-DE')}`}
    >
      {formattedValue}
    </div>
  );
};

export default NodeValueOverlay; 