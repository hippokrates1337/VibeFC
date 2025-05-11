import { Module } from '@nestjs/common';
import { ForecastController } from './controllers/forecast.controller';
import { ForecastService } from './services/forecast.service';
import { ForecastNodeService } from './services/forecast-node.service';
import { ForecastEdgeService } from './services/forecast-edge.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ForecastController],
  providers: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService
  ],
  exports: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService
  ],
})
export class ForecastModule {} 