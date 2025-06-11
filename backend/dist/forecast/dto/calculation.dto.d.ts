export declare class CalculateForecastDto {
    readonly forecastId: string;
}
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
