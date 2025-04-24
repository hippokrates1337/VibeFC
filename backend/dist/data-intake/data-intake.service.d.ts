import { SupabaseService } from '../supabase/supabase.service';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
export declare class DataIntakeService {
    private supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    addVariables(addVariablesDto: AddVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    getVariablesByUser(userId: string): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    updateVariables(updateVariablesDto: UpdateVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    deleteVariables(deleteVariablesDto: DeleteVariablesDto): Promise<{
        message: string;
        count: number;
    }>;
    private normalizeTimeSeriesValues;
}
