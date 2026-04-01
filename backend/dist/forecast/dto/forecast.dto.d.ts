export declare class CreateForecastDto {
    name: string;
    forecastStartDate: string;
    forecastEndDate: string;
    organizationId: string;
    forecastStartMonth?: string;
    forecastEndMonth?: string;
    actualStartMonth?: string;
    actualEndMonth?: string;
}
export declare class UpdateForecastDto {
    name?: string;
    forecastStartDate?: string;
    forecastEndDate?: string;
    forecastStartMonth?: string;
    forecastEndMonth?: string;
    actualStartMonth?: string;
    actualEndMonth?: string;
}
export declare class UpdateForecastPeriodsDto {
    forecastStartMonth?: string;
    forecastEndMonth?: string;
    actualStartMonth?: string;
    actualEndMonth?: string;
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
    forecastStartMonth?: string;
    forecastEndMonth?: string;
    actualStartMonth?: string;
    actualEndMonth?: string;
}
