"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PerformanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
let PerformanceService = PerformanceService_1 = class PerformanceService {
    constructor() {
        this.logger = new common_1.Logger(PerformanceService_1.name);
        this.metrics = [];
        this.maxMetrics = 1000;
    }
    async trackOperation(operationName, operation, metadata) {
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
        }
        catch (error) {
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
    trackSync(operationName, operation, metadata) {
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
            if (duration > 100) {
                this.logger.log(`Sync operation ${operationName} completed in ${duration.toFixed(2)}ms`, {
                    operation: operationName,
                    duration: duration.toFixed(2),
                    success: true,
                    ...metadata
                });
            }
            return result;
        }
        catch (error) {
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
    recordMetric(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
    }
    getMetrics(operationName, since) {
        let filteredMetrics = this.metrics;
        if (operationName) {
            filteredMetrics = filteredMetrics.filter(m => m.operation === operationName);
        }
        if (since) {
            filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
        }
        return filteredMetrics;
    }
    getAverageTime(operationName, since) {
        const metrics = this.getMetrics(operationName, since).filter(m => m.success);
        if (metrics.length === 0) {
            return 0;
        }
        const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);
        return totalTime / metrics.length;
    }
    getSuccessRate(operationName, since) {
        const metrics = this.getMetrics(operationName, since);
        if (metrics.length === 0) {
            return 0;
        }
        const successCount = metrics.filter(m => m.success).length;
        return (successCount / metrics.length) * 100;
    }
    getStats(operationName, since) {
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
    clearMetrics() {
        this.metrics.length = 0;
        this.logger.log('Performance metrics cleared');
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = PerformanceService_1 = __decorate([
    (0, common_1.Injectable)()
], PerformanceService);
//# sourceMappingURL=performance.service.js.map