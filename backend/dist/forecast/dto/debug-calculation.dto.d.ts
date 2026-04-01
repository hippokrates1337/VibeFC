import { UnifiedCalculationResultDto, CalculationTypeDto } from './calculation.dto';
export declare class DebugCalculationStepDto {
    readonly nodeId: string;
    readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    readonly stepNumber: number;
    readonly month: string;
    readonly calculationType: CalculationTypeDto;
    readonly inputs: any[];
    readonly output: number | null;
    readonly executionTimeMs: number;
    readonly dependencies: string[];
    readonly errorMessage?: string;
    readonly nodeAttributes?: any;
}
export declare class DebugTreeNodeDto {
    readonly nodeId: string;
    readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    readonly nodeData: any;
    readonly children: DebugTreeNodeDto[];
    readonly inputOrder?: string[];
    readonly position: {
        x: number;
        y: number;
    };
    readonly label?: string;
    readonly isReference?: boolean;
}
export declare class DebugCalculationTreeDto {
    readonly trees: DebugTreeNodeDto[];
    readonly executionOrder: string[];
    readonly totalNodes: number;
    readonly dependencyGraph: Record<string, string[]>;
    readonly metricOrder: string[];
}
export declare class DebugPerformanceMetricsDto {
    readonly totalExecutionTimeMs: number;
    readonly nodeExecutionTimes: Record<string, number>;
    readonly cacheHitRate: number;
    readonly totalCacheHits: number;
    readonly totalCacheMisses: number;
    readonly memoryUsageMB?: number;
    readonly phaseTimings: {
        validation: number;
        treeProcessing: number;
        calculation: number;
        resultBuilding: number;
    };
}
export declare class DebugInfoDto {
    readonly calculationTree: DebugCalculationTreeDto;
    readonly calculationSteps: DebugCalculationStepDto[];
    readonly performanceMetrics: DebugPerformanceMetricsDto;
    readonly warnings?: string[];
    readonly errors?: string[];
}
export declare class DebugCalculationResultDto extends UnifiedCalculationResultDto {
    readonly debugInfo: DebugInfoDto;
}
export declare class DebugCalculationRequestDto {
    readonly calculationTypes: CalculationTypeDto[];
    readonly includeIntermediateNodes?: boolean;
    readonly debugLevel?: 'basic' | 'detailed' | 'verbose';
    readonly includePerformanceMetrics?: boolean;
    readonly includeMemoryUsage?: boolean;
    readonly focusNodeIds?: string[];
}
export declare class CalculationTreeRequestDto {
    readonly includePositions?: boolean;
    readonly includeNodeAttributes?: boolean;
}
