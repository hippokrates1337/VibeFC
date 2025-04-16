import { AddVariablesDto } from './dto/add-variables.dto';
import { SupabaseService } from '../supabase/supabase.service';
export declare class DataIntakeService {
    private supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    addVariables(addVariablesDto: AddVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
}
