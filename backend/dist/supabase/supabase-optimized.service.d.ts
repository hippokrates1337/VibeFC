import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
export declare class SupabaseOptimizedService implements OnModuleDestroy {
    private configService;
    private readonly clientPool;
    private readonly logger;
    private readonly isTestEnvironment;
    private readonly isAdminMode;
    private readonly cleanupInterval;
    private readonly supabaseUrl;
    private readonly serviceRoleKey;
    private readonly anonKey;
    constructor(configService: ConfigService);
    onModuleDestroy(): void;
    getClientForRequest(request: Request): SupabaseClient;
    get client(): SupabaseClient;
    private createAuthenticatedClient;
    private setAuthContext;
    private cleanupExpiredClients;
    getPoolStats(): {
        totalClients: number;
        expiredClients: number;
    };
}
