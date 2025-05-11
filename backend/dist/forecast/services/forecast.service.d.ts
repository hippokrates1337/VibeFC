import { SupabaseService } from '../../supabase/supabase.service';
import { CreateForecastDto, UpdateForecastDto, ForecastDto } from '../dto/forecast.dto';
export declare class ForecastService {
    private supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    create(userId: string, dto: CreateForecastDto): Promise<ForecastDto>;
    findAll(userId: string, organizationId: string): Promise<ForecastDto[]>;
    findOne(id: string, userId: string): Promise<ForecastDto>;
    update(id: string, userId: string, dto: UpdateForecastDto): Promise<void>;
    remove(id: string, userId: string): Promise<void>;
    private mapDbEntityToDto;
}
