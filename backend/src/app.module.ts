import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataIntakeModule } from './data-intake/data-intake.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ForecastModule } from './forecast/forecast.module';
import { TestAuthModule } from './test-auth/test-auth.module';
import { UsersModule } from './users/users.module';

const ENABLE_TEST_AUTH_ENDPOINT = process.env.ENABLE_TEST_AUTH_ENDPOINT === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    DataIntakeModule,
    HealthModule,
    OrganizationsModule,
    ForecastModule,
    ...(ENABLE_TEST_AUTH_ENDPOINT ? [TestAuthModule] : []),
    UsersModule,
  ],
})
export class AppModule {} 