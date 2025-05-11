export declare class CreateForecastEdgeDto {
    forecastId: string;
    sourceNodeId: string;
    targetNodeId: string;
    attributes?: Record<string, any>;
}
export declare class UpdateForecastEdgeDto {
    attributes?: Record<string, any>;
    sourceNodeId?: string;
    targetNodeId?: string;
}
export declare class ForecastEdgeDto {
    id: string;
    forecastId: string;
    sourceNodeId: string;
    targetNodeId: string;
    createdAt: Date;
}
