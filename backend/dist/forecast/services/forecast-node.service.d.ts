import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto } from '../dto/forecast-node.dto';
import { Request } from 'express';
export declare class ForecastNodeService {
    private supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseOptimizedService);
    create(dto: CreateForecastNodeDto, request: Request): Promise<ForecastNodeDto>;
    findByForecast(forecastId: string, request: Request): Promise<ForecastNodeDto[]>;
    findOne(id: string, request: Request, forecastId?: string): Promise<ForecastNodeDto>;
    update(id: string, dto: UpdateForecastNodeDto, request: Request): Promise<void>;
    remove(id: string, request: Request): Promise<void>;
    private mapDbEntityToDto;
}
