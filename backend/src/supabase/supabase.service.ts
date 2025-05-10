import { Injectable, Scope, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

// Assuming RequestWithUser interface is defined elsewhere or inline if needed
interface RequestWithUser extends Request {
  user?: { // User might not be set yet depending on middleware order
    userId: string;
    organizationId?: string;
    [key: string]: any;
  };
}

@Injectable({ scope: Scope.REQUEST }) // Make the service request-scoped
export class SupabaseService {
  private supabaseClient: SupabaseClient | null = null; // Client will be created per request
  private readonly logger = new Logger(SupabaseService.name);

  constructor(
    private configService: ConfigService,
    @Inject(REQUEST) private request: RequestWithUser // Inject the request object
  ) {}

  // No more OnModuleInit - client is created on demand

  get client(): SupabaseClient {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY'); // Use Anon key for base client

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.error('Supabase URL or Anon Key not configured');
      throw new Error('Supabase credentials are not properly configured.');
    }

    // Extract JWT from the Authorization header of the injected request
    const authHeader = this.request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       // This should ideally be caught by the guard first, but good to have a check
      this.logger.warn('Attempted to create Supabase client without Authorization header.');
      throw new UnauthorizedException('Authorization token is missing or invalid.');
    }
    const token = authHeader.split(' ')[1];

    // Create a new client instance for this request, authenticating with the user's token
    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        // Detect session in server-side contexts may not be necessary when explicitly passing the token
        // detectSessionInUrl: false 
      }
    });
    
    this.logger.log('Request-scoped Supabase client initialized for user.');
    return this.supabaseClient;
  }

  // testConnection method is removed as it relied on the admin client
  // and testing connection per-request is less meaningful / potentially complex.
} 