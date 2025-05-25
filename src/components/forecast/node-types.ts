/**
 * React Flow Node Types - Isolated Module
 * 
 * This module exports stable node and edge type objects that are created once
 * and never change. This is critical for React Flow v11+ to prevent warnings
 * about creating new nodeTypes or edgeTypes objects.
 */

import { MarkerType } from 'reactflow';
import DataNode from './nodes/DataNode';
import ConstantNode from './nodes/ConstantNode';
import OperatorNode from './nodes/OperatorNode';
import MetricNode from './nodes/MetricNode';
import SeedNode from './nodes/SeedNode';
import RankedEdge from './edges/RankedEdge';

// Node types - created once, never changes
export const nodeTypes = {
  DATA: DataNode,
  CONSTANT: ConstantNode,
  OPERATOR: OperatorNode,
  METRIC: MetricNode,
  SEED: SeedNode
} as const;

// Edge types - now includes our custom ranked edge
export const edgeTypes = {
  default: RankedEdge,
} as const;

// Default edge options - created once, never changes
export const defaultEdgeOptions = {
  style: {
    strokeWidth: 2,
    stroke: '#94a3b8',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
    width: 20,
    height: 20,
  },
  animated: false,
} as const;

// Connection line style - created once, never changes
export const connectionLineStyle = {
  strokeWidth: 2,
  stroke: '#60a5fa',
  strokeDasharray: '5,5',
} as const; 