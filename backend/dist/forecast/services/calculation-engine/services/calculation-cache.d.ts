import { CalculationCache, CalculationType } from '../types/calculation-types';
export declare class CalculationCacheService implements CalculationCache {
    private cache;
    get(key: string): number | null | undefined;
    set(key: string, value: number | null): void;
    clear(): void;
    generateKey(nodeId: string, month: string, calculationType: CalculationType): string;
    has(key: string): boolean;
    delete(key: string): boolean;
    size(): number;
    clearNode(nodeId: string): void;
    clearMonth(month: string): void;
    getStats(): {
        size: number;
        hitRate?: number;
    };
}
