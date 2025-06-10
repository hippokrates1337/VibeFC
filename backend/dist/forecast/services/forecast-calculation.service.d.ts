import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { Request } from 'express';
import { DataIntakeService } from '../../data-intake/data-intake.service';
import { ForecastService } from './forecast.service';
import { ForecastNodeService } from './forecast-node.service';
import { ForecastEdgeService } from './forecast-edge.service';
import { ForecastCalculationResultDto } from '../dto/calculation.dto';
export declare class ForecastCalculationService {
    private readonly supabaseService;
    private readonly dataIntakeService;
    private readonly forecastService;
    private readonly forecastNodeService;
    private readonly forecastEdgeService;
    private readonly logger;
    constructor(supabaseService: SupabaseOptimizedService, dataIntakeService: DataIntakeService, forecastService: ForecastService, forecastNodeService: ForecastNodeService, forecastEdgeService: ForecastEdgeService);
    calculateForecast(forecastId: string, userId: string, request: Request): Promise<ForecastCalculationResultDto>;
    private executeRealCalculation;
    private validateDataIntegrity;
    private transformNodesToCalculationFormat;
    private transformEdgesToCalculationFormat;
    private transformVariablesToCalculationFormat;
    getLatestCalculationResults(forecastId: string, userId: string, request: Request): Promise<ForecastCalculationResultDto | null>;
    getCalculationHistory(forecastId: string, userId: string, request: Request): Promise<ForecastCalculationResultDto[]>;
    private storeCalculationResults;
    private mapDatabaseResultToDto;
}
