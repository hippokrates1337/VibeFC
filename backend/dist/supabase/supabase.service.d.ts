import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
interface RequestWithUser extends Request {
    user?: {
        userId: string;
        organizationId?: string;
        [key: string]: any;
    };
}
export declare class SupabaseService {
    private configService;
    private request;
    private supabaseClient;
    private readonly logger;
    constructor(configService: ConfigService, request: RequestWithUser);
    get client(): SupabaseClient;
}
export {};
