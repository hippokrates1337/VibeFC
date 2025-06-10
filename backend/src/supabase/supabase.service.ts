import { Injectable, Scope, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

// For types only - extend Express Request for TypeScript only
type UserInfo = {
  userId: string;
  organizationId?: string;
  [key: string]: any;
};

@Injectable({ scope: Scope.REQUEST }) // Make the service request-scoped
export class SupabaseService {
  private supabaseClient: SupabaseClient | null = null; // Client will be created per request
  private readonly logger = new Logger(SupabaseService.name);
  private readonly isTestEnvironment: boolean;
  private readonly isAdminMode: boolean;

  constructor(
    private configService: ConfigService,
    @Inject(REQUEST) private request: Request // Inject the request object as standard Express Request
  ) {
    this.isTestEnvironment = process.env.IS_TEST_ENVIRONMENT === 'true';
    this.isAdminMode = process.env.SUPABASE_ADMIN_MODE === 'true';
    this.logger.log(`SupabaseService initialized in ${this.isTestEnvironment ? 'TEST' : 'PRODUCTION'} mode, Admin Mode: ${this.isAdminMode}`);
    
    if (this.isTestEnvironment) {
      // Debug log the user in the request for test environments
      this.logger.debug(`Request user in constructor: ${JSON.stringify((this.request as any).user)}`);
      this.logger.debug(`Request auth header: ${this.request.headers.authorization}`);
    }
  }

  private get user(): UserInfo | undefined {
    // Access user property safely with type assertion
    const userInfo = (this.request as any).user;
    
    if (this.isTestEnvironment && !userInfo) {
      this.logger.warn('No user found in request during test environment');
    }
    
    return userInfo;
  }

  // No more OnModuleInit - client is created on demand

  get client(): SupabaseClient {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || (!supabaseAnonKey && !serviceRoleKey)) {
      this.logger.error('Supabase URL or API keys not configured');
      throw new Error('Supabase credentials are not properly configured.');
    }
    
    // Decide which key to use - prefer service role in test and admin environments
    const keyToUse = (this.isTestEnvironment || this.isAdminMode) && serviceRoleKey 
      ? serviceRoleKey 
      : supabaseAnonKey || '';

    // Extract JWT from the Authorization header of the injected request
    const authHeader = this.request.headers.authorization as string;
    let token = authHeader?.split(' ')[1];

    try {
      // If in admin mode, create a pure admin client that bypasses JWT auth
      if (this.isAdminMode) {
        this.logger.log('Creating admin client with service role key (bypassing JWT validation)');
        
        // Create client with the service role key and no JWT auth
        this.supabaseClient = createClient(supabaseUrl, keyToUse, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        // In admin mode, we still need to set user context for RLS
        if (this.user?.userId) {
          // For admin mode in tests, we'll use a synchronous approach to set auth
          // First log that we're going to set the user context
          this.logger.debug(`Setting user context for RLS with user ID: ${this.user.userId}`);
          
          // Use RPC to set the auth.uid() in PostgreSQL for RLS policies
          this.setAuthContext(this.user.userId);
        } else {
          this.logger.warn('Admin mode active but no user ID available for RLS context');
        }
        
        return this.supabaseClient;
      }
      
      // Special handling for test environment
      if (this.isTestEnvironment) {
        // In tests, check if we have a user object with userId
        if (this.user?.userId) {
          this.logger.log(`Test environment with user ${this.user.userId} - creating authenticated client`);
          
          // Create a client with JWT auth for the user in tests
          // This is crucial for RLS policies that depend on auth.uid()
          this.supabaseClient = createClient(supabaseUrl, keyToUse, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
            global: {
              headers: {
                // Pass the user ID in a format that Supabase will recognize for RLS
                Authorization: `Bearer ${token || 'test-token'}`,
              },
            },
          });
          
          // Double-check - if we couldn't get a token from the header but have a user ID,
          // we should set the auth context manually
          if (!token && this.user.userId) {
            this.logger.debug(`No auth token available, setting explicit RLS context for user: ${this.user.userId}`);
            this.setAuthContext(this.user.userId);
          }
          
          // Log important details for debugging
          this.logger.debug(`Test client created with auth header: ${authHeader}`);
          this.logger.debug(`Test client user: ${JSON.stringify(this.user)}`);
          
          return this.supabaseClient;
        } else {
          this.logger.warn('Test environment but no user in request - creating anonymous client');
          
          // Create an anonymous client for test environment without user
          this.supabaseClient = createClient(supabaseUrl, keyToUse, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          
          return this.supabaseClient;
        }
      }
      
      // In non-test environments, enforce authorization header
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // This should ideally be caught by the guard first, but good to have a check
        this.logger.warn('Attempted to create Supabase client without Authorization header.');
        throw new UnauthorizedException('Authorization token is missing or invalid.');
      }
      
      // Create a new client instance for this request, authenticating with the user's token
      this.supabaseClient = createClient(supabaseUrl, keyToUse, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      });
      
      this.logger.log('Request-scoped Supabase client initialized for user.');
      return this.supabaseClient;
    } catch (error) {
      this.logger.error(`Error creating Supabase client: ${(error as Error).message}`);
      throw error;
    }
  }

  // Helper method to set the auth context for RLS policies
  private setAuthContext(userId: string): void {
    if (!this.supabaseClient) {
      this.logger.error('Cannot set auth context - no Supabase client available');
      return;
    }
    
    try {
      // Call PostgreSQL function to set the auth.uid() for the current connection
      // This is a synchronous operation that affects the current DB connection only
      this.supabaseClient.rpc('set_auth_user_id', { user_id: userId })
        .then(() => {
          this.logger.debug(`Auth context set successfully for user ${userId}`);
        })
        .then(undefined, (err: Error) => {
          this.logger.error(`Failed to set auth context: ${err.message}`);
        });
    } catch (error) {
      this.logger.error(`Error setting auth context: ${(error as Error).message}`);
    }
  }
} 