import { Controller, Get } from '@nestjs/common';
// SupabaseService might not be needed if no supabase checks are done here
// import { SupabaseService } from '../supabase/supabase.service';

@Controller('health')
export class HealthController {
  // Remove SupabaseService injection if no longer needed
  constructor(/* private readonly supabaseService: SupabaseService */) {}

  @Get()
  async check() {
    // Basic health check remains
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // Removed the @Get('supabase') checkSupabase method as it relied on the old testConnection
} 