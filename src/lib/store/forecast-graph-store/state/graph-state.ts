import type { ForecastNodeClient, ForecastEdgeClient } from '../types';

export interface GraphState {
  nodes: ForecastNodeClient[];
  edges: ForecastEdgeClient[];
  isDirty: boolean;
  lastEditedNodePosition: { x: number; y: number } | null;
}
