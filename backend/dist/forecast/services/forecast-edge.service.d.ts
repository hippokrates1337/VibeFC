import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { ForecastNodeService } from './forecast-node.service';
import { Request } from 'express';
export declare class ForecastEdgeService {
    private supabaseService;
    private readonly nodeService;
    private readonly logger;
    constructor(supabaseService: SupabaseOptimizedService, nodeService: ForecastNodeService);
    create(dto: CreateForecastEdgeDto, request: Request): Promise<ForecastEdgeDto>;
    findByForecast(forecastId: string, request: Request): Promise<ForecastEdgeDto[]>;
    findOne(id: string, request: Request): Promise<ForecastEdgeDto>;
    remove(id: string, request: Request): Promise<void>;
    private mapDbEntityToDto;
}
