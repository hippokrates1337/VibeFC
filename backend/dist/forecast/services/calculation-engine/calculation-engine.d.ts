import { CalculationEngineCore } from './calculation-engine-core';
import { CalculationAdapter } from './adapters/calculation-adapter';
import type { Variable, CalculationTree, ForecastCalculationResult, ExtendedForecastCalculationResult, UnifiedCalculationRequest, UnifiedCalculationResult } from './types';
export declare class CalculationEngine {
    private readonly coreEngine?;
    private readonly adapter?;
    private readonly useNewEngine;
    private readonly logger;
    constructor(coreEngine?: CalculationEngineCore | undefined, adapter?: CalculationAdapter | undefined, useNewEngine?: boolean);
    calculateForecast(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ForecastCalculationResult>;
    calculateForecastExtended(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
    calculateHistoricalValues(trees: readonly CalculationTree[], actualStartDate: Date, actualEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
    calculateWithPeriods(trees: readonly CalculationTree[], forecastStartMonth: string, forecastEndMonth: string, actualStartMonth: string, actualEndMonth: string, variables: readonly Variable[], request: UnifiedCalculationRequest): Promise<UnifiedCalculationResult>;
    calculateComprehensive(trees: readonly CalculationTree[], forecastStartDate: Date, forecastEndDate: Date, actualStartDate: Date, actualEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
    getStats(): {
        supportedCalculationTypes: import("./types/calculation-types").CalculationType[];
        supportedNodeTypes: string[];
        cacheStats: {
            size: number;
        };
    };
    clearCaches(): void;
    validateRequest(request: any): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    dryRun(request: any): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        estimatedNodes: number;
        estimatedMonths: number;
    }>;
    private dateToMMYYYY;
    private mmyyyyToDate;
}
