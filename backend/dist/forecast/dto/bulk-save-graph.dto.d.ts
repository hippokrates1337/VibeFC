export declare class ForecastMetadataDto {
    name: string;
    forecastStartDate: string;
    forecastEndDate: string;
}
export declare class BulkNodeDto {
    clientId: string;
    kind: string;
    attributes: Record<string, any>;
    position: {
        x: number;
        y: number;
    };
}
export declare class BulkEdgeDto {
    sourceClientId: string;
    targetClientId: string;
}
export declare class BulkSaveGraphDto {
    forecast: ForecastMetadataDto;
    nodes: BulkNodeDto[];
    edges: BulkEdgeDto[];
}
export declare class FlattenedForecastWithDetailsDto {
    id: string;
    name: string;
    forecastStartDate: string;
    forecastEndDate: string;
    organizationId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    nodes: any[];
    edges: any[];
}
