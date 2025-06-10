import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../dto/forecast.dto';
import { BulkSaveGraphDto, FlattenedForecastWithDetailsDto } from '../dto/bulk-save-graph.dto';
import { PerformanceService } from '../../common/services/performance.service';
import { Request } from 'express';
export declare class ForecastService {
    private supabaseService;
    private performanceService;
    private readonly logger;
    constructor(supabaseService: SupabaseOptimizedService, performanceService: PerformanceService);
    create(userId: string, dto: CreateForecastDto, request: Request): Promise<ForecastDto>;
    findAll(userId: string, organizationId: string, request: Request): Promise<ForecastDto[]>;
    findOne(id: string, userId: string, request: Request): Promise<ForecastDto>;
    update(id: string, userId: string, dto: UpdateForecastDto, request: Request): Promise<void>;
    remove(id: string, userId: string, request: Request): Promise<void>;
    bulkSaveGraph(forecastId: string, userId: string, dto: BulkSaveGraphDto, request: Request): Promise<FlattenedForecastWithDetailsDto>;
    private mapDbEntityToDto;
}
