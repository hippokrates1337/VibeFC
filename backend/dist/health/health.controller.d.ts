import { SupabaseService } from '../supabase/supabase.service';
export declare class HealthController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    check(): Promise<{
        status: string;
        timestamp: string;
    }>;
    checkSupabase(): Promise<{
        status: string;
        message: string;
        timestamp: string;
    }>;
}
