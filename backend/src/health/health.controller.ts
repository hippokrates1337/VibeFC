import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('health')
export class HealthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('supabase')
  async checkSupabase() {
    try {
      const isConnected = await this.supabaseService.testConnection();
      return {
        status: isConnected ? 'ok' : 'error',
        message: 'Supabase connection successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Supabase connection failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
} 