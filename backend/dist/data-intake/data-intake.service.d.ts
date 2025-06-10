import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { Request } from 'express';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
export declare class DataIntakeService {
    private supabase;
    private readonly logger;
    constructor(supabase: SupabaseOptimizedService);
    addVariables(addVariablesDto: AddVariablesDto, request: Request): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    getVariablesByUser(userId: string, request: Request): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    updateVariables(updateVariablesDto: UpdateVariablesDto, request: Request): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    deleteVariables(deleteVariablesDto: DeleteVariablesDto, requestingUserId: string, requestingOrgId: string, request: Request): Promise<{
        message: string;
        count: number;
        deletedIds: string[];
    }>;
    private normalizeTimeSeriesValues;
}
