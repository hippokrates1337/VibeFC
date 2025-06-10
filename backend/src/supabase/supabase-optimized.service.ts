import { Injectable, Logger, UnauthorizedException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { createHash } from 'crypto';

interface CachedClient {
  client: SupabaseClient;
  expiry: number;
}

type UserInfo = {
  userId: string;
  organizationId?: string;
  [key: string]: any;
};

@Injectable()
export class SupabaseOptimizedService implements OnModuleDestroy {
  private readonly clientPool = new Map<string, CachedClient>();
  private readonly logger = new Logger(SupabaseOptimizedService.name);
  private readonly isTestEnvironment: boolean;
  private readonly isAdminMode: boolean;
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly anonKey: string;

  constructor(private configService: ConfigService) {
    this.isTestEnvironment = process.env.IS_TEST_ENVIRONMENT === 'true';
    this.isAdminMode = process.env.SUPABASE_ADMIN_MODE === 'true';
    
    // Cache configuration values
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';
    this.anonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
    
    if (!this.supabaseUrl || (!this.anonKey && !this.serviceRoleKey)) {
      throw new Error('Supabase credentials are not properly configured.');
    }
    
    // Clean up expired clients every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredClients(), 5 * 60 * 1000);
    
    this.logger.log(`SupabaseOptimizedService initialized in ${this.isTestEnvironment ? 'TEST' : 'PRODUCTION'} mode, Admin Mode: ${this.isAdminMode}`);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    this.clientPool.clear();
    this.logger.log('SupabaseOptimizedService destroyed, cleared client pool');
  }

  getClientForRequest(request: Request): SupabaseClient {
    const authHeader = request.headers.authorization as string;
    const user = (request as any).user as UserInfo;
    
    if (!authHeader || !user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Create cache key from user ID and token hash
    const tokenHash = createHash('sha256').update(authHeader).digest('hex').substring(0, 16);
    const cacheKey = `${user.userId}-${tokenHash}`;
    
    const cached = this.clientPool.get(cacheKey);
    const now = Date.now();
    
    if (cached && cached.expiry > now) {
      if (this.isTestEnvironment) {
        this.logger.debug(`Using cached client for user ${user.userId}`);
      }
      return cached.client;
    }

    // Create new client
    const client = this.createAuthenticatedClient(authHeader, user);
    
    // Cache for 10 minutes
    this.clientPool.set(cacheKey, {
      client,
      expiry: now + (10 * 60 * 1000)
    });

    if (this.isTestEnvironment) {
      this.logger.debug(`Created new cached client for user ${user.userId}`);
    }

    return client;
  }

  // Backwards compatibility method
  get client(): SupabaseClient {
    throw new Error('Direct client access not supported in optimized service. Use getClientForRequest() instead.');
  }

  private createAuthenticatedClient(authHeader: string, user: UserInfo): SupabaseClient {
    const keyToUse = (this.isTestEnvironment || this.isAdminMode) && this.serviceRoleKey 
      ? this.serviceRoleKey 
      : this.anonKey;
    
    const token = authHeader.split(' ')[1];

    try {
      if (this.isAdminMode) {
        this.logger.debug(`Creating admin client for user ${user.userId}`);
        
        const client = createClient(this.supabaseUrl, keyToUse, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        // Set auth context for RLS
        this.setAuthContext(client, user.userId);
        return client;
      }
      
      if (this.isTestEnvironment) {
        this.logger.debug(`Creating test client for user ${user.userId}`);
        
        const client = createClient(this.supabaseUrl, keyToUse, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
        
        if (!token && user.userId) {
          this.setAuthContext(client, user.userId);
        }
        
        return client;
      }
      
      // Production client
      return createClient(this.supabaseUrl, keyToUse, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      });
    } catch (error) {
      this.logger.error(`Error creating Supabase client: ${(error as Error).message}`);
      throw error;
    }
  }

  private setAuthContext(client: SupabaseClient, userId: string): void {
    try {
      client.rpc('set_auth_user_id', { user_id: userId })
        .then(() => {
          this.logger.debug(`Auth context set for user ${userId}`);
        }, (err: Error) => {
          this.logger.error(`Failed to set auth context: ${err.message}`);
        });
    } catch (error) {
      this.logger.error(`Error setting auth context: ${(error as Error).message}`);
    }
  }

  private cleanupExpiredClients(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.clientPool.entries()) {
      if (value.expiry <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.clientPool.delete(key));
    
    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired Supabase clients`);
    }
  }

  // Debug method for monitoring
  getPoolStats(): { totalClients: number; expiredClients: number } {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [, value] of this.clientPool.entries()) {
      if (value.expiry <= now) {
        expiredCount++;
      }
    }
    
    return {
      totalClients: this.clientPool.size,
      expiredClients: expiredCount
    };
  }
} 