import { ExecutionContext } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
export declare class JwtAuthGuard implements CanActivate {
    private supabaseService;
    constructor(supabaseService: SupabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
