/**
 * Types for the debug calculation endpoints. The steps come from the forecast engine's
 * trace (packages/forecast-engine), mapped by DebugCalculationService.
 */
import type { CalcType, NodeType } from '@vibefc/forecast-engine';

export type { NodeType };
export type CalculationType = CalcType;

export type DebugLevel = 'basic' | 'detailed' | 'verbose';

export interface DebugCalculationStep {
  nodeId: string;
  nodeType: NodeType;
  stepNumber: number;
  month: string; // MM-YYYY
  calculationType: CalculationType;
  /** 'window': inside the calc type's period; 'past': a base-case value before it. */
  phase?: 'window' | 'past';
  inputs: any[];
  output: number | null;
  executionTimeMs: number;
  dependencies: string[];
  errorMessage?: string;
  nodeAttributes?: any;
  timestamp: Date;
}
