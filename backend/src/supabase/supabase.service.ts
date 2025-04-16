import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabaseClient: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not provided in environment variables');
    }

    // Use service_role key to bypass RLS policies
    // IMPORTANT: This gives admin privileges - make sure your backend is secure
    this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.logger.log('Supabase client initialized with service_role key (bypasses RLS)');
    
    try {
      await this.testConnection();
      this.logger.log('Successfully connected to Supabase');
    } catch (error) {
      this.logger.error(`Failed to connect to Supabase: ${error.message}`);
      throw error;
    }
  }

  get client(): SupabaseClient {
    return this.supabaseClient;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Try to access the variables table to verify connection
      const { error } = await this.supabaseClient
        .from('variables')
        .select('id')
        .limit(1);
      
      if (error) {
        this.logger.error(`Database connection test failed: ${error.message}`);
        throw new Error(`Database connection test failed: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      throw error;
    }
  }
} 