import { Request } from 'express';
import { ForecastCalculationService } from './forecast-calculation.service';
import { DebugCollectorService } from './debug-collector.service';
import { DebugCalculationRequestDto, DebugCalculationResultDto, DebugCalculationTreeDto, CalculationTreeRequestDto } from '../dto/debug-calculation.dto';
export declare class DebugCalculationService {
    private readonly forecastCalculationService;
    private readonly debugCollector;
    private readonly logger;
    private mapCalculationType;
    constructor(forecastCalculationService: ForecastCalculationService, debugCollector: DebugCollectorService);
    calculateWithDebug(forecastId: string, userId: string, request: any, debugRequest: DebugCalculationRequestDto): Promise<DebugCalculationResultDto>;
    getCalculationTree(forecastId: string, userId: string, request: Request, _requestDto?: CalculationTreeRequestDto): Promise<DebugCalculationTreeDto>;
    getCalculationSteps(forecastId: string): Promise<any[]>;
    private getCalculationTreeStructure;
    private buildDependencyGraphFromCalcTrees;
    private mapToDebugTreeDto;
    private mapDebugTreeNodeToDto;
    private getMaxStepsForLevel;
}
