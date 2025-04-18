import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService implements OnModuleInit {
    private configService;
    private supabaseClient;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    get client(): SupabaseClient;
    testConnection(): Promise<boolean>;
}
