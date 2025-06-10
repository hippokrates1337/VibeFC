import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseOptimizedService } from './supabase-optimized.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SupabaseOptimizedService, // Optimized singleton service with connection pooling
  ],
  exports: [
    SupabaseOptimizedService, // Export optimized service directly
  ],
})
export class SupabaseModule {} 