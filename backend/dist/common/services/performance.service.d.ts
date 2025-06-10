interface PerformanceMetrics {
    operation: string;
    duration: number;
    success: boolean;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export declare class PerformanceService {
    private readonly logger;
    private readonly metrics;
    private readonly maxMetrics;
    trackOperation<T>(operationName: string, operation: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
    trackSync<T>(operationName: string, operation: () => T, metadata?: Record<string, any>): T;
    private recordMetric;
    getMetrics(operationName?: string, since?: Date): PerformanceMetrics[];
    getAverageTime(operationName: string, since?: Date): number;
    getSuccessRate(operationName: string, since?: Date): number;
    getStats(operationName?: string, since?: Date): {
        totalOperations: number;
        successRate: number;
        averageTime: number;
        minTime: number;
        maxTime: number;
        errorCount: number;
    };
    clearMetrics(): void;
}
export {};
