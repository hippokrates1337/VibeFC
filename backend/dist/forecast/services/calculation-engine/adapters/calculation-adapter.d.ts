import { CalculationEngineCore } from '../calculation-engine-core';
import { Variable } from '../types/calculation-types';
import type { ForecastCalculationResult, ExtendedForecastCalculationResult, UnifiedCalculationResult, UnifiedCalculationRequest, CalculationTree as LegacyCalculationTree } from '../types';
export declare class CalculationAdapter {
    private readonly newEngine;
    constructor(newEngine: CalculationEngineCore);
    calculateForecast(trees: readonly LegacyCalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ForecastCalculationResult>;
    calculateForecastExtended(trees: readonly LegacyCalculationTree[], forecastStartDate: Date, forecastEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
    calculateHistoricalValues(trees: readonly LegacyCalculationTree[], actualStartDate: Date, actualEndDate: Date, variables: readonly Variable[]): Promise<ExtendedForecastCalculationResult>;
    calculateWithPeriods(trees: readonly LegacyCalculationTree[], forecastStartMonth: string, forecastEndMonth: string, actualStartMonth: string, actualEndMonth: string, variables: readonly Variable[], request: UnifiedCalculationRequest): Promise<UnifiedCalculationResult>;
    private adaptLegacyForecastRequest;
    private adaptLegacyHistoricalRequest;
    private adaptUnifiedRequest;
    private convertLegacyTrees;
    private adaptToLegacyForecastResult;
    private adaptToExtendedForecastResult;
    private adaptToUnifiedResult;
    private convertToLegacyMetrics;
    private convertToLegacyNodes;
    private convertToUnifiedNodes;
    private dateToMMYYYY;
    private mmyyyyToDate;
    private addMonths;
    private subtractMonths;
}
