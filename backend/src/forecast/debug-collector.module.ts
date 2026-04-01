import { Module } from '@nestjs/common';
import { DebugCollectorService } from './services/debug-collector.service';

/**
 * Shared module so {@link DebugCollectorService} is the same instance in
 * {@link ForecastModule} and {@link CalculationEngineCoreModule} (engine records steps into it).
 */
@Module({
  providers: [DebugCollectorService],
  exports: [DebugCollectorService],
})
export class DebugCollectorModule {}
