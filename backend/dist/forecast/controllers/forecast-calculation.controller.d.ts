import { ForecastCalculationService } from '../services/forecast-calculation.service';
import { DebugCalculationService } from '../services/debug-calculation.service';
import { ForecastCalculationResultDto, CalculationHealthDto, UnifiedCalculationRequestDto, UnifiedCalculationResultDto } from '../dto/calculation.dto';
import { DebugCalculationRequestDto, DebugCalculationResultDto, DebugCalculationTreeDto } from '../dto/debug-calculation.dto';
export declare class ForecastCalculationController {
    private readonly forecastCalculationService;
    private readonly debugCalculationService;
    private readonly logger;
    constructor(forecastCalculationService: ForecastCalculationService, debugCalculationService: DebugCalculationService);
    calculateUnified(forecastId: string, body: UnifiedCalculationRequestDto, req: any): Promise<UnifiedCalculationResultDto>;
    getUnifiedCalculationResults(forecastId: string, req: any): Promise<UnifiedCalculationResultDto | null>;
    getCalculationHistory(forecastId: string, req: any): Promise<ForecastCalculationResultDto[]>;
    healthCheck(): Promise<CalculationHealthDto>;
    calculateWithDebug(forecastId: string, body: DebugCalculationRequestDto, req: any): Promise<DebugCalculationResultDto>;
    getCalculationTree(forecastId: string, req: any): Promise<DebugCalculationTreeDto>;
    getCalculationSteps(forecastId: string, req: any): Promise<any[]>;
}
