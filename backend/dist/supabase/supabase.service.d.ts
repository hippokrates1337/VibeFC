import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
export declare class SupabaseService {
    private configService;
    private request;
    private supabaseClient;
    private readonly logger;
    private readonly isTestEnvironment;
    private readonly isAdminMode;
    constructor(configService: ConfigService, request: Request);
    private get user();
    get client(): SupabaseClient;
    private setAuthContext;
}
