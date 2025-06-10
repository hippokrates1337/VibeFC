import { Module } from '@nestjs/common';
import { PerformanceService } from './services/performance.service';

@Module({
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class CommonModule {} 