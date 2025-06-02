export declare class CreateForecastDto {
    name: string;
    forecastStartDate: string;
    forecastEndDate: string;
    organizationId: string;
}
export declare class UpdateForecastDto {
    name?: string;
    forecastStartDate?: string;
    forecastEndDate?: string;
}
export declare class ForecastDto {
    id: string;
    name: string;
    forecastStartDate: string;
    forecastEndDate: string;
    organizationId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
