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
import { CalculationEngine } from './services/calculation-engine/calculation-engine';
import { CalculationEngineCore } from './services/calculation-engine/calculation-engine-core';
import { VariableDataService } from './services/calculation-engine/variable-data-service';
import { MMYYYYUtilsService } from './services/calculation-engine/mmyyyy-utils';
import { CalculationAdapter } from './services/calculation-engine/adapters/calculation-adapter';
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
    // GraphConverter, // TODO: Add back when needed
    // Configure CalculationEngine with proper DI
    {
      provide: CalculationEngine,
      useFactory: (coreEngine, adapter, useNewEngine) => {
        return new CalculationEngine(coreEngine, adapter, useNewEngine);
      },
      inject: [CalculationEngineCore, CalculationAdapter, 'USE_NEW_CALCULATION_ENGINE']
    },
    // Feature flag for new calculation engine
    {
      provide: 'USE_NEW_CALCULATION_ENGINE',
      useValue: process.env.USE_NEW_CALCULATION_ENGINE === 'true' || true // Enable new engine by default
    }
  ],
  exports: [
    ForecastService,
    ForecastNodeService,
    ForecastEdgeService,
    ForecastCalculationService
  ],
})
export class ForecastModule {} 