import { CalculationRequest, CalculationResult, CalculationType } from './types/calculation-types';
import { NodeEvaluator } from './services/node-evaluator';
import { TreeProcessor } from './services/tree-processor';
import { ResultBuilder } from './services/result-builder';
import { CalculationValidator } from './services/calculation-validator';
import { PeriodService } from './services/period-service';
import { CalculationCacheService } from './services/calculation-cache';
import { DebugCollectorService } from '../debug-collector.service';
export declare class CalculationEngineCore {
    private readonly nodeEvaluator;
    private readonly treeProcessor;
    private readonly resultBuilder;
    private readonly validator;
    private readonly periodService;
    private readonly cache;
    private readonly logger;
    private readonly debugCollector;
    constructor(nodeEvaluator: NodeEvaluator, treeProcessor: TreeProcessor, resultBuilder: ResultBuilder, validator: CalculationValidator, periodService: PeriodService, cache: CalculationCacheService, logger: any, debugCollector: DebugCollectorService);
    calculate(request: CalculationRequest): Promise<CalculationResult>;
    private calculateAllNodes;
    private calculateTree;
    private calculateNode;
    private shouldCalculateForMonth;
    private createContext;
    getStats(): {
        supportedCalculationTypes: CalculationType[];
        supportedNodeTypes: string[];
        cacheStats: {
            size: number;
        };
    };
    clearCaches(): void;
    private getNodeInputs;
    private getNodeDependencies;
    private getValueByCalculationType;
    validateRequest(request: CalculationRequest): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    dryRun(request: CalculationRequest): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        estimatedNodes: number;
        estimatedMonths: number;
    }>;
}
