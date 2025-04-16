import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataIntakeModule } from './data-intake/data-intake.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    DataIntakeModule,
    HealthModule,
  ],
})
export class AppModule {} 