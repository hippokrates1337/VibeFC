import { SupabaseService } from '../../supabase/supabase.service';
import { CreateForecastEdgeDto, ForecastEdgeDto } from '../dto/forecast-edge.dto';
import { ForecastNodeService } from './forecast-node.service';
export declare class ForecastEdgeService {
    private supabaseService;
    private readonly nodeService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, nodeService: ForecastNodeService);
    create(dto: CreateForecastEdgeDto): Promise<ForecastEdgeDto>;
    findByForecast(forecastId: string): Promise<ForecastEdgeDto[]>;
    findOne(id: string): Promise<ForecastEdgeDto>;
    remove(id: string): Promise<void>;
    private mapDbEntityToDto;
}
