import { beforeEach, describe, expect, test } from '@jest/globals';
import { create } from 'zustand';
import type { UnifiedCalculationResult, UnifiedNodeResult, UnifiedMonthlyValue } from '@/types/forecast';
import { format } from 'date-fns';

// Create a test store focused on node value functionality using unified types
interface TestNodeValueStore {
  calculationResults: UnifiedCalculationResult | null;
  setCalculationResults: (results: UnifiedCalculationResult) => void;
  getNodeValueForMonth: (nodeId: string, month: Date) => { value: number; type: 'forecast' | 'calculated' } | null;
}

const createTestNodeStore = () => create<TestNodeValueStore>((set, get) => ({
  calculationResults: null,

  setCalculationResults: (results) => {
    set({ calculationResults: results });
  },

  getNodeValueForMonth: (nodeId: string, month: Date) => {
    const state = get();
    const results = state.calculationResults;
    
    if (!results?.allNodes) return null;
    
    const nodeResult = results.allNodes.find(node => node.nodeId === nodeId);
    if (!nodeResult?.values) return null;
    
    // Convert Date to MM-YYYY format for comparison
    const targetMonth = format(month, 'MM-yyyy');
    
    const monthlyValue = nodeResult.values.find((v: UnifiedMonthlyValue) => {
      return v.month === targetMonth;
    });

    if (!monthlyValue) return null;

    // For METRIC nodes, prefer forecast values
    if (nodeResult.nodeType === 'METRIC') {
      if (monthlyValue.forecast !== null) {
        return {
          value: monthlyValue.forecast,
          type: 'forecast' as const
        };
      }
    }
    
    // For all other nodes (DATA, OPERATOR, SEED), use calculated values
    if (monthlyValue.calculated !== null && monthlyValue.calculated !== undefined) {
      return {
        value: monthlyValue.calculated,
        type: 'calculated' as const
      };
    }
    
    return null;
  },
}));

describe('Node Value Retrieval - Phase 8 Unified', () => {
  let store: ReturnType<typeof createTestNodeStore>;
  let getState: () => TestNodeValueStore;

  beforeEach(() => {
    store = createTestNodeStore();
    getState = store.getState;
  });

  const createMockUnifiedResults = (): UnifiedCalculationResult => ({
    id: 'test-result-id',
    forecastId: 'test-forecast',
    calculatedAt: new Date(),
    calculationTypes: ['forecast', 'historical', 'budget'],
    periodInfo: {
      forecastStartMonth: '02-2025',
      forecastEndMonth: '03-2025',
      actualStartMonth: '12-2024',
      actualEndMonth: '01-2025'
    },
    metrics: [],
    allNodes: [
      {
        nodeId: 'metric-node-1',
        nodeType: 'METRIC',
        values: [
          {
            month: '02-2025', // February
            budget: 1000,
            historical: 900,
            forecast: 1100,
            calculated: null
          },
          {
            month: '03-2025', // March
            budget: 1200,
            historical: 1050,
            forecast: 1300,
            calculated: null
          }
        ]
      },
      {
        nodeId: 'data-node-1',
        nodeType: 'DATA',
        values: [
          {
            month: '02-2025', // February
            budget: null,
            historical: null,
            forecast: null,
            calculated: 500
          },
          {
            month: '03-2025', // March
            budget: null,
            historical: null,
            forecast: null,
            calculated: 600
          }
        ]
      },
      {
        nodeId: 'operator-node-1',
        nodeType: 'OPERATOR',
        values: [
          {
            month: '02-2025', // February
            budget: null,
            historical: null,
            forecast: null,
            calculated: 1600
          }
        ]
      }
    ]
  });

  describe('METRIC Node Values', () => {
    test('should return forecast values for METRIC nodes', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 1100,
        type: 'forecast'
      });
    });

    test('should handle METRIC nodes for different months', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      const febResult = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      const marResult = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 2, 1));
      
      expect(febResult?.value).toBe(1100);
      expect(marResult?.value).toBe(1300);
      expect(febResult?.type).toBe('forecast');
      expect(marResult?.type).toBe('forecast');
    });
  });

  describe('Non-METRIC Node Values', () => {
    test('should return calculated values for DATA nodes', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('data-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 500,
        type: 'calculated'
      });
    });

    test('should return calculated values for OPERATOR nodes', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('operator-node-1', new Date(2025, 1, 1)); // February
      
      expect(result).toEqual({
        value: 1600,
        type: 'calculated'
      });
    });
  });

  describe('Edge Cases', () => {
    test('should return null for non-existent nodes', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('non-existent-node', new Date(2025, 1, 1));
      
      expect(result).toBeNull();
    });

    test('should return null for non-existent months', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 5, 1)); // June (not in data)
      
      expect(result).toBeNull();
    });

    test('should return null when no calculation results available', () => {
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      
      expect(result).toBeNull();
    });
  });

  describe('Unified System Integration', () => {
    test('should work with MM-YYYY month format', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      // Should correctly convert Date to MM-YYYY for lookup
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1)); // Feb 2025 -> 02-2025
      
      expect(result?.value).toBe(1100);
    });

    test('should handle unified calculation result structure', () => {
      const mockResults = createMockUnifiedResults();
      getState().setCalculationResults(mockResults);
      
      // Verify the unified structure is properly handled
      expect(mockResults.calculationTypes).toContain('forecast');
      expect(mockResults.periodInfo.forecastStartMonth).toBe('02-2025');
      
      const result = getState().getNodeValueForMonth('metric-node-1', new Date(2025, 1, 1));
      expect(result).not.toBeNull();
    });
  });
}); 