import { Module } from '@nestjs/common';
import { ForecastController } from './controllers/forecast.controller';
import { ForecastCalculationController } from './controllers/forecast-calculation.controller';
import { ForecastService } from './services/forecast.service';
import { ForecastNodeService } from './services/forecast-node.service';
import { ForecastEdgeService } from './services/forecast-edge.service';
import { ForecastCalculationService } from './services/forecast-calculation.service';
import { DebugCalculationService } from './services/debug-calculation.service';
import { DebugCollectorModule } from './debug-collector.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { DataIntakeModule } from '../data-intake/data-intake.module';
import { CommonModule } from '../common/common.module';
import { CalculationEngineCoreModule } from './services/calculation-engine/calculation-engine-core.module';
import { VariableDataService } from './services/calculation-engine/variable-data-service';
import { MMYYYYUtilsService } from './services/calculation-engine/mmyyyy-utils';
import { CalculationAdapter } from './services/calculation-engine/adapters/calculation-adapter';
import { ForecastEngineService } from './services/forecast-engine.service';
// import { GraphConverter } from './services/calculation-engine/graph-converter'; // TODO: Add back when needed

@Module({
  imports: [
    SupabaseModule, 
    DataIntakeModule, 
    CommonModule,
    DebugCollectorModule,
    CalculationEngineCoreModule
  ],
  controllers: [ForecastController, ForecastCalculationController],
  providers: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService,
    ForecastCalculationService,
    DebugCalculationService,
    VariableDataService,
    MMYYYYUtilsService,
    CalculationAdapter,
    ForecastEngineService,
    // GraphConverter, // TODO: Add back when needed
  ],
  exports: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService,
    ForecastCalculationService
  ],
})
export class ForecastModule {} 