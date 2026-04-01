export declare class MonthlyForecastValueDto {
    readonly date: string;
    readonly forecast: number | null;
    readonly budget: number | null;
    readonly historical: number | null;
}
export declare class MonthlyNodeValueDto extends MonthlyForecastValueDto {
    readonly calculated: number | null;
}
export declare class NodeCalculationResultDto {
    readonly nodeId: string;
    readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
    readonly values: MonthlyNodeValueDto[];
}
export declare class MetricCalculationResultDto {
    readonly metricNodeId: string;
    readonly values: MonthlyForecastValueDto[];
}
export declare class ForecastCalculationResultDto {
    readonly id: string;
    readonly forecastId: string;
    readonly calculatedAt: string;
    readonly metrics: MetricCalculationResultDto[];
    readonly allNodes?: NodeCalculationResultDto[];
}
export declare class CalculationHealthDto {
    readonly status: string;
    readonly timestamp: string;
}
export declare enum CalculationTypeDto {
    HISTORICAL = "historical",
    FORECAST = "forecast",
    BUDGET = "budget"
}
export declare class UnifiedCalculationRequestDto {
    readonly calculationTypes: CalculationTypeDto[];
    readonly includeIntermediateNodes: boolean;
}
export declare class UnifiedMonthlyValueDto {
    readonly month: string;
    readonly historical: number | null;
    readonly forecast: number | null;
    readonly budget: number | null;
    readonly calculated: number | null;
}
export declare class UnifiedNodeResultDto {
    readonly nodeId: string;
    readonly nodeType: string;
    readonly values: UnifiedMonthlyValueDto[];
}
export declare class PeriodInfoDto {
    readonly forecastStartMonth: string;
    readonly forecastEndMonth: string;
    readonly actualStartMonth: string;
    readonly actualEndMonth: string;
}
export declare class UnifiedCalculationResultDto {
    readonly id: string;
    readonly forecastId: string;
    readonly calculatedAt: string;
    readonly calculationTypes: CalculationTypeDto[];
    readonly periodInfo: PeriodInfoDto;
    readonly metrics: UnifiedNodeResultDto[];
    readonly allNodes?: UnifiedNodeResultDto[];
}
