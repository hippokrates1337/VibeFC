import { Module } from '@nestjs/common';
import { ForecastController } from './controllers/forecast.controller';
import { ForecastCalculationController } from './controllers/forecast-calculation.controller';
import { ForecastService } from './services/forecast.service';
import { ForecastNodeService } from './services/forecast-node.service';
import { ForecastEdgeService } from './services/forecast-edge.service';
import { ForecastCalculationService } from './services/forecast-calculation.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { DataIntakeModule } from '../data-intake/data-intake.module';

@Module({
  imports: [SupabaseModule, DataIntakeModule],
  controllers: [ForecastController, ForecastCalculationController],
  providers: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService,
    ForecastCalculationService
  ],
  exports: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService,
    ForecastCalculationService
  ],
})
export class ForecastModule {} 