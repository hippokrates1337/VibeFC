/**
 * Refactored Calculation Engine Module - Phase 1.3
 * Dependency injection setup for new calculation engine
 */

import { Module } from '@nestjs/common';
import { CalculationEngineCore } from './calculation-engine-core';
import { NodeEvaluator } from './services/node-evaluator';
import { TreeProcessor } from './services/tree-processor';
import { ResultBuilder } from './services/result-builder';
import { CalculationValidator } from './services/calculation-validator';
import { PeriodService } from './services/period-service';
import { CalculationCacheService } from './services/calculation-cache';

// Strategy implementations (will be created in Phase 2)
import { DataNodeStrategy } from './strategies/data-node-strategy';
import { ConstantNodeStrategy } from './strategies/constant-node-strategy';
import { OperatorNodeStrategy } from './strategies/operator-node-strategy';
import { MetricNodeStrategy } from './strategies/metric-node-strategy';
import { SeedNodeStrategy } from './strategies/seed-node-strategy';

// Import existing services that will be reused
import { VariableDataService } from './variable-data-service';
import { DebugCollectorModule } from '../../debug-collector.module';

@Module({
  imports: [DebugCollectorModule],
  providers: [
    // Main calculation engine
    CalculationEngineCore,
    
    // Core services
    NodeEvaluator,
    TreeProcessor,
    ResultBuilder,
    CalculationValidator,
    PeriodService,
    CalculationCacheService,
    
    // Strategy implementations
    DataNodeStrategy,
    ConstantNodeStrategy,
    OperatorNodeStrategy,
    MetricNodeStrategy,
    SeedNodeStrategy,
    
    // Existing services (reused)
    VariableDataService,
    
    // Logger provider (simple console logger for now)
    {
      provide: 'Logger',
      useValue: {
        log: (message: string, ...args: any[]) => console.log(message, ...args),
        error: (message: string, ...args: any[]) => console.error(message, ...args),
        warn: (message: string, ...args: any[]) => console.warn(message, ...args),
      }
    },
  ],
  exports: [
    CalculationEngineCore,
    NodeEvaluator,
    TreeProcessor,
    ResultBuilder,
    CalculationValidator,
    PeriodService,
    CalculationCacheService,
  ],
})
export class CalculationEngineCoreModule {}
