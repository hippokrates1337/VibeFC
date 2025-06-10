import { ForecastCalculationService } from '../services/forecast-calculation.service';
import { ForecastCalculationResultDto, CalculationHealthDto } from '../dto/calculation.dto';
export declare class ForecastCalculationController {
    private readonly forecastCalculationService;
    private readonly logger;
    constructor(forecastCalculationService: ForecastCalculationService);
    calculateForecast(forecastId: string, req: any): Promise<ForecastCalculationResultDto>;
    getCalculationResults(forecastId: string, req: any): Promise<ForecastCalculationResultDto | null>;
    getCalculationHistory(forecastId: string, req: any): Promise<ForecastCalculationResultDto[]>;
    healthCheck(): Promise<CalculationHealthDto>;
}
