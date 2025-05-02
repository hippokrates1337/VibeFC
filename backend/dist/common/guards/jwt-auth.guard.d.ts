import { ExecutionContext } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class JwtAuthGuard implements CanActivate {
    private configService;
    private readonly logger;
    private supabaseAdminClient;
    constructor(configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
