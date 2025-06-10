import { Injectable, Logger } from '@nestjs/common';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = new Date();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        operation: operationName,
        duration,
        success: true,
        timestamp,
        metadata
      });
      
      this.logger.log(`Operation ${operationName} completed in ${duration.toFixed(2)}ms`, {
        operation: operationName,
        duration: duration.toFixed(2),
        success: true,
        ...metadata
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        operation: operationName,
        duration,
        success: false,
        timestamp,
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      this.logger.error(`Operation ${operationName} failed after ${duration.toFixed(2)}ms`, {
        operation: operationName,
        duration: duration.toFixed(2),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata
      });
      
      throw error;
    }
  }

  trackSync<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    const timestamp = new Date();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        operation: operationName,
        duration,
        success: true,
        timestamp,
        metadata
      });
      
      if (duration > 100) { // Only log slow operations
        this.logger.log(`Sync operation ${operationName} completed in ${duration.toFixed(2)}ms`, {
          operation: operationName,
          duration: duration.toFixed(2),
          success: true,
          ...metadata
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        operation: operationName,
        duration,
        success: false,
        timestamp,
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      this.logger.error(`Sync operation ${operationName} failed after ${duration.toFixed(2)}ms`, {
        operation: operationName,
        duration: duration.toFixed(2),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata
      });
      
      throw error;
    }
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(operationName?: string, since?: Date): PerformanceMetrics[] {
    let filteredMetrics = this.metrics;
    
    if (operationName) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operationName);
    }
    
    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
    }
    
    return filteredMetrics;
  }

  getAverageTime(operationName: string, since?: Date): number {
    const metrics = this.getMetrics(operationName, since).filter(m => m.success);
    
    if (metrics.length === 0) {
      return 0;
    }
    
    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / metrics.length;
  }

  getSuccessRate(operationName: string, since?: Date): number {
    const metrics = this.getMetrics(operationName, since);
    
    if (metrics.length === 0) {
      return 0;
    }
    
    const successCount = metrics.filter(m => m.success).length;
    return (successCount / metrics.length) * 100;
  }

  getStats(operationName?: string, since?: Date): {
    totalOperations: number;
    successRate: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    errorCount: number;
  } {
    const metrics = this.getMetrics(operationName, since);
    const successfulMetrics = metrics.filter(m => m.success);
    
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        errorCount: 0
      };
    }
    
    const durations = successfulMetrics.map(m => m.duration);
    
    return {
      totalOperations: metrics.length,
      successRate: (successfulMetrics.length / metrics.length) * 100,
      averageTime: durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
      minTime: Math.min(...durations) || 0,
      maxTime: Math.max(...durations) || 0,
      errorCount: metrics.length - successfulMetrics.length
    };
  }

  clearMetrics(): void {
    this.metrics.length = 0;
    this.logger.log('Performance metrics cleared');
  }
} 