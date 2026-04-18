import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { Request } from 'express';
export declare class InvitesClaimService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseOptimizedService);
    claimPendingInvitesForUser(request: Request): Promise<{
        claimed: number;
    }>;
}
