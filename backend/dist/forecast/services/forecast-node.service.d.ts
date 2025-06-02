import { SupabaseService } from '../../supabase/supabase.service';
import { CreateForecastNodeDto, UpdateForecastNodeDto, ForecastNodeDto } from '../dto/forecast-node.dto';
export declare class ForecastNodeService {
    private supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    create(dto: CreateForecastNodeDto): Promise<ForecastNodeDto>;
    findByForecast(forecastId: string): Promise<ForecastNodeDto[]>;
    findOne(id: string, forecastId?: string): Promise<ForecastNodeDto>;
    update(id: string, dto: UpdateForecastNodeDto): Promise<void>;
    remove(id: string): Promise<void>;
    private mapDbEntityToDto;
}
