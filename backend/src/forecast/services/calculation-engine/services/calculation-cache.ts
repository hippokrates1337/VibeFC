/**
 * Calculation Cache Service - Phase 1.2
 * Unified caching strategy for all calculation types
 */

import { Injectable } from '@nestjs/common';
import { CalculationCache, CalculationType } from '../types/calculation-types';

@Injectable()
export class CalculationCacheService implements CalculationCache {
  private cache = new Map<string, number | null>();

  get(key: string): number | null | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: number | null): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(nodeId: string, month: string, calculationType: CalculationType): string {
    return `${nodeId}:${month}:${calculationType}`;
  }

  // Additional utility methods
  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  // Clear cache entries for specific node
  clearNode(nodeId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${nodeId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear cache entries for specific month
  clearMonth(month: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${month}:`)) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
      // Hit rate would require tracking hits/misses
    };
  }
}
