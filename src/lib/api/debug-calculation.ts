import { createClient } from '@supabase/supabase-js';

// Use NEXT_PUBLIC_BACKEND_URL to point to the separate backend service
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Create Supabase client for authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define response types
interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    statusCode?: number;
  };
}

// Auth-aware fetch function
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        error: {
          message: 'No authentication token available',
          statusCode: 401
        }
      };
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // If not JSON, use the text as is
        if (errorText) {
          errorMessage = errorText;
        }
      }

      return {
        error: {
          message: errorMessage,
          statusCode: response.status
        }
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500
      }
    };
  }
}

// ========================================
// Debug Types (matching backend DTOs)
// ========================================

export type DebugLevel = 'basic' | 'detailed' | 'verbose';
export type CalculationType = 'historical' | 'forecast' | 'budget';

export interface DebugCalculationRequest {
  calculationTypes: CalculationType[];
  includeIntermediateNodes?: boolean;
  debugLevel?: DebugLevel;
  includePerformanceMetrics?: boolean;
  includeMemoryUsage?: boolean;
  focusNodeIds?: string[];
}

export interface DebugCalculationStep {
  nodeId: string;
  nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  stepNumber: number;
  month: string;
  calculationType: CalculationType;
  inputs: any[];
  output: number | null;
  executionTimeMs: number;
  dependencies: string[];
  errorMessage?: string;
  nodeAttributes?: any;
}

export interface DebugTreeNode {
  nodeId: string;
  nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  nodeData: any;
  children: DebugTreeNode[];
  inputOrder?: string[];
  position: { x: number; y: number };
  label?: string;
  isReference?: boolean;
}

export interface DebugCalculationTree {
  trees: DebugTreeNode[];
  executionOrder: string[];
  totalNodes: number;
  dependencyGraph: Record<string, string[]>;
  metricOrder: string[];
}

export interface DebugPerformanceMetrics {
  totalExecutionTimeMs: number;
  nodeExecutionTimes: Record<string, number>;
  cacheHitRate: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  memoryUsageMB?: number;
  phaseTimings: {
    validation: number;
    treeProcessing: number;
    calculation: number;
    resultBuilding: number;
  };
}

export interface DebugInfo {
  calculationTree: DebugCalculationTree;
  calculationSteps: DebugCalculationStep[];
  performanceMetrics: DebugPerformanceMetrics;
  warnings?: string[];
  errors?: string[];
}

export interface DebugCalculationResult {
  id: string;
  forecastId: string;
  calculatedAt: string;
  calculationTypes: CalculationType[];
  periodInfo: {
    forecastStartMonth: string;
    forecastEndMonth: string;
    actualStartMonth: string;
    actualEndMonth: string;
  };
  metrics: any[];
  allNodes?: any[];
  debugInfo: DebugInfo;
}

// ========================================
// Debug Calculation API
// ========================================

export interface DebugCalculationApi {
  calculateWithDebug: (forecastId: string, request: DebugCalculationRequest) => Promise<DebugCalculationResult>;
  getCalculationTree: (forecastId: string) => Promise<DebugCalculationTree>;
  getCalculationSteps: (forecastId: string) => Promise<DebugCalculationStep[]>;
}

/**
 * Debug calculation API implementation
 * Provides comprehensive debugging capabilities for forecast calculations
 */
export const debugCalculationApi: DebugCalculationApi = {
  /**
   * Trigger calculation with comprehensive debug information
   */
  async calculateWithDebug(forecastId: string, request: DebugCalculationRequest): Promise<DebugCalculationResult> {
    console.log(`[DebugCalculationApi] Triggering debug calculation for forecast ${forecastId}:`, request);
    
    const response = await fetchWithAuth<DebugCalculationResult>(
      `/forecasts/${forecastId}/calculate-debug`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (response.error) {
      console.error('[DebugCalculationApi] Debug calculation failed:', response.error);
      
      // Enhanced error handling for debug calculations
      if (response.error.statusCode === 400) {
        if (response.error.message.includes('period') || response.error.message.includes('MM-YYYY')) {
          throw new Error(`Period validation error: ${response.error.message}`);
        }
        if (response.error.message.includes('debug')) {
          throw new Error(`Debug configuration error: ${response.error.message}`);
        }
        throw new Error(`Invalid debug request: ${response.error.message}`);
      }
      
      if (response.error.statusCode === 404) {
        throw new Error(`Forecast ${forecastId} not found or accessible`);
      }
      
      if (response.error.statusCode === 403) {
        throw new Error(`Access denied to forecast ${forecastId}`);
      }
      
      if (response.error.statusCode === 500) {
        throw new Error(`Server error during debug calculation: ${response.error.message}`);
      }
      
      throw new Error(`Debug calculation failed: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error('No debug calculation result returned from server');
    }

    console.log(`[DebugCalculationApi] Debug calculation completed for forecast ${forecastId}`);
    console.log(`[DebugCalculationApi] Captured ${response.data.debugInfo.calculationSteps.length} calculation steps`);
    console.log(`[DebugCalculationApi] Total execution time: ${response.data.debugInfo.performanceMetrics.totalExecutionTimeMs}ms`);
    
    return response.data;
  },

  /**
   * Get calculation tree structure without performing full calculation
   */
  async getCalculationTree(forecastId: string): Promise<DebugCalculationTree> {
    console.log(`[DebugCalculationApi] Getting calculation tree for forecast ${forecastId}`);
    
    const response = await fetchWithAuth<DebugCalculationTree>(
      `/forecasts/${forecastId}/debug/calculation-tree`,
      {
        method: 'GET',
      }
    );

    if (response.error) {
      console.error('[DebugCalculationApi] Failed to get calculation tree:', response.error);
      throw new Error(`Failed to get calculation tree: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error('No calculation tree returned from server');
    }

    console.log(`[DebugCalculationApi] Calculation tree retrieved for forecast ${forecastId}`);
    console.log(`[DebugCalculationApi] Tree contains ${response.data.totalNodes} nodes across ${response.data.trees.length} metric trees`);
    
    return response.data;
  },

  /**
   * Get detailed calculation steps from the last debug calculation
   */
  async getCalculationSteps(forecastId: string): Promise<DebugCalculationStep[]> {
    console.log(`[DebugCalculationApi] Getting calculation steps for forecast ${forecastId}`);
    
    const response = await fetchWithAuth<DebugCalculationStep[]>(
      `/forecasts/${forecastId}/debug/calculation-steps`,
      {
        method: 'GET',
      }
    );

    if (response.error) {
      console.error('[DebugCalculationApi] Failed to get calculation steps:', response.error);
      throw new Error(`Failed to get calculation steps: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error('No calculation steps returned from server');
    }

    console.log(`[DebugCalculationApi] Retrieved ${response.data.length} calculation steps for forecast ${forecastId}`);
    
    return response.data;
  }
};

// ========================================
// Utility Functions
// ========================================

/**
 * Create a default debug calculation request
 */
export function createDefaultDebugRequest(): DebugCalculationRequest {
  return {
    calculationTypes: ['historical', 'forecast', 'budget'],
    includeIntermediateNodes: true,
    debugLevel: 'detailed',
    includePerformanceMetrics: true,
    includeMemoryUsage: false
  };
}

/**
 * Create a focused debug request for specific nodes
 */
export function createFocusedDebugRequest(nodeIds: string[], level: DebugLevel = 'verbose'): DebugCalculationRequest {
  return {
    calculationTypes: ['historical', 'forecast', 'budget'],
    includeIntermediateNodes: true,
    debugLevel: level,
    includePerformanceMetrics: true,
    includeMemoryUsage: true,
    focusNodeIds: nodeIds
  };
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(timeMs: number): string {
  if (timeMs < 1) {
    return '<1ms';
  } else if (timeMs < 1000) {
    return `${Math.round(timeMs)}ms`;
  } else {
    return `${(timeMs / 1000).toFixed(2)}s`;
  }
}

/**
 * Get node type color for visualization
 */
export function getNodeTypeColor(nodeType: string): string {
  switch (nodeType) {
    case 'METRIC':
      return '#10b981'; // green
    case 'DATA':
      return '#3b82f6'; // blue
    case 'CONSTANT':
      return '#f59e0b'; // amber
    case 'OPERATOR':
      return '#8b5cf6'; // violet
    case 'SEED':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}
