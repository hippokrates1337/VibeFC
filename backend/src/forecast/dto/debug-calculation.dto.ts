import { IsUUID, IsString, IsNumber, IsArray, IsOptional, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UnifiedCalculationResultDto, CalculationTypeDto } from './calculation.dto';

/**
 * DTO for a single debug calculation step
 * Captures detailed information about each node evaluation
 */
export class DebugCalculationStepDto {
  @IsUUID()
  readonly nodeId: string;

  @IsString()
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

  @IsNumber()
  readonly stepNumber: number;

  @IsString()
  readonly month: string; // MM-YYYY format

  @IsEnum(CalculationTypeDto)
  readonly calculationType: CalculationTypeDto;

  @IsArray()
  readonly inputs: any[]; // Input values for this calculation step

  @IsOptional()
  readonly output: number | null; // Result of this calculation step

  @IsNumber()
  readonly executionTimeMs: number;

  @IsArray()
  @IsString({ each: true })
  readonly dependencies: string[]; // Node IDs this step depends on

  @IsOptional()
  @IsString()
  readonly errorMessage?: string; // If calculation failed

  @IsOptional()
  @IsObject()
  readonly nodeAttributes?: any; // Full node attributes for context
}

/**
 * DTO for debug tree node structure
 * Enhanced version of calculation tree node with debug information
 */
export class DebugTreeNodeDto {
  @IsUUID()
  readonly nodeId: string;

  @IsString()
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

  @IsObject()
  readonly nodeData: any; // Node attributes/configuration

  @IsArray()
  @Type(() => DebugTreeNodeDto)
  readonly children: DebugTreeNodeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly inputOrder?: string[]; // For operator nodes

  @IsObject()
  readonly position: { x: number; y: number }; // Visual position in graph

  @IsOptional()
  @IsString()
  readonly label?: string; // Human-readable label

  @IsOptional()
  readonly isReference?: boolean; // Flag for reference nodes
}

/**
 * DTO for complete calculation tree structure with debug metadata
 */
export class DebugCalculationTreeDto {
  @IsArray()
  @Type(() => DebugTreeNodeDto)
  readonly trees: DebugTreeNodeDto[]; // Array of tree roots (metrics)

  @IsArray()
  @IsString({ each: true })
  readonly executionOrder: string[]; // Order nodes were processed

  @IsNumber()
  readonly totalNodes: number;

  @IsObject()
  readonly dependencyGraph: Record<string, string[]>; // nodeId -> [dependentNodeIds]

  @IsArray()
  @IsString({ each: true })
  readonly metricOrder: string[]; // Order metrics were calculated
}

/**
 * DTO for performance metrics collected during debug calculation
 */
export class DebugPerformanceMetricsDto {
  @IsNumber()
  readonly totalExecutionTimeMs: number;

  @IsObject()
  readonly nodeExecutionTimes: Record<string, number>; // nodeId -> total time

  @IsNumber()
  readonly cacheHitRate: number; // Percentage of cache hits

  @IsNumber()
  readonly totalCacheHits: number;

  @IsNumber()
  readonly totalCacheMisses: number;

  @IsNumber()
  readonly memoryUsageMB?: number; // Optional memory usage

  @IsObject()
  readonly phaseTimings: {
    validation: number;
    treeProcessing: number;
    calculation: number;
    resultBuilding: number;
  };
}

/**
 * DTO for debug information container
 */
export class DebugInfoDto {
  @IsObject()
  @Type(() => DebugCalculationTreeDto)
  readonly calculationTree: DebugCalculationTreeDto;

  @IsArray()
  @Type(() => DebugCalculationStepDto)
  readonly calculationSteps: DebugCalculationStepDto[];

  @IsObject()
  @Type(() => DebugPerformanceMetricsDto)
  readonly performanceMetrics: DebugPerformanceMetricsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly warnings?: string[]; // Validation or calculation warnings

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly errors?: string[]; // Any errors encountered
}

/**
 * DTO for unified calculation result with debug information
 * Extends the standard unified result with comprehensive debug data
 */
export class DebugCalculationResultDto extends UnifiedCalculationResultDto {
  @IsObject()
  @Type(() => DebugInfoDto)
  readonly debugInfo: DebugInfoDto;
}

/**
 * DTO for debug calculation request
 * Allows configuring level of debug detail
 */
export class DebugCalculationRequestDto {
  @IsArray()
  @IsEnum(CalculationTypeDto, { each: true })
  readonly calculationTypes: CalculationTypeDto[];

  @IsOptional()
  readonly includeIntermediateNodes?: boolean;

  @IsOptional()
  @IsString()
  readonly debugLevel?: 'basic' | 'detailed' | 'verbose'; // Level of debug info

  @IsOptional()
  readonly includePerformanceMetrics?: boolean;

  @IsOptional()
  readonly includeMemoryUsage?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly focusNodeIds?: string[]; // Only debug specific nodes if provided
}

/**
 * DTO for simplified calculation tree request
 * For getting just the tree structure without full calculation
 */
export class CalculationTreeRequestDto {
  @IsOptional()
  readonly includePositions?: boolean;

  @IsOptional()
  readonly includeNodeAttributes?: boolean;
}
