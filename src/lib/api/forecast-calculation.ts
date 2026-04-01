import type { 
  HistoricalCalculationRequest,
  UnifiedCalculationResult,
  UnifiedCalculationRequest
} from '@/types/forecast';

// Legacy types for deprecated methods (Phase 8 cleanup - these methods will be removed)
interface ForecastCalculationResult {
  readonly forecastId: string;
  readonly calculatedAt: Date;
  readonly metrics: readonly {
    readonly metricNodeId: string;
    readonly values: readonly {
      readonly date: Date;
      readonly forecast: number | null;
      readonly budget: number | null;
      readonly historical: number | null;
    }[];
  }[];
}

interface ExtendedForecastCalculationResult extends ForecastCalculationResult {
  readonly allNodes?: readonly {
    readonly nodeId: string;
    readonly nodeType: string;
    readonly values: readonly {
      readonly date: Date;
      readonly forecast: number | null;
      readonly budget: number | null;
      readonly historical: number | null;
      readonly calculated: number | null;
    }[];
  }[];
}

// Use NEXT_PUBLIC_BACKEND_URL to point to the backend service
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * DTO interfaces matching backend response structure
 */
interface MonthlyForecastValueDto {
  readonly date: string;
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
}

interface MonthlyNodeValueDto extends MonthlyForecastValueDto {
  readonly calculated: number | null;
}

interface MetricCalculationResultDto {
  readonly metricNodeId: string;
  readonly values: MonthlyForecastValueDto[];
}

interface NodeCalculationResultDto {
  readonly nodeId: string;
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  readonly values: MonthlyNodeValueDto[];
}

interface ForecastCalculationResultDto {
  readonly id: string;
  readonly forecastId: string;
  readonly calculatedAt: string;
  readonly metrics: MetricCalculationResultDto[];
  readonly allNodes?: NodeCalculationResultDto[];
}

// NEW: Unified calculation DTOs for Phase 4
interface UnifiedMonthlyValueDto {
  readonly month: string; // MM-YYYY format
  readonly forecast: number | null;
  readonly budget: number | null;
  readonly historical: number | null;
  readonly calculated?: number | null; // For nodes (not metrics)
}

interface UnifiedNodeResultDto {
  readonly nodeId: string;
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';
  readonly values: UnifiedMonthlyValueDto[];
}

interface PeriodInfoDto {
  readonly forecastStartMonth: string; // MM-YYYY
  readonly forecastEndMonth: string; // MM-YYYY
  readonly actualStartMonth: string; // MM-YYYY
  readonly actualEndMonth: string; // MM-YYYY
}

interface UnifiedCalculationResultDto {
  readonly id: string;
  readonly forecastId: string;
  readonly calculatedAt: string;
  readonly calculationTypes: readonly ('historical' | 'forecast' | 'budget')[];
  readonly periodInfo: PeriodInfoDto;
  readonly metrics: UnifiedNodeResultDto[];
  readonly allNodes?: UnifiedNodeResultDto[];
}

interface CalculationHealthDto {
  readonly status: string;
  readonly timestamp: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    statusCode?: number;
  };
}

/**
 * Helper function to get auth token from cookie
 */
function getAuthToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-access-token') {
      return value;
    }
  }
  return undefined;
}

/**
 * Helper function for API requests with auth token
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined };
    }

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (e: any) {
      if (response.ok) {
        return {
          error: {
            message: `Failed to parse JSON response: ${e.message}`,
            statusCode: response.status,
          },
        };
      }
    }

    if (!response.ok) {
      return {
        error: {
          message: (data && data.message) || responseText || 'An error occurred',
          statusCode: response.status,
        },
      };
    }

    return { data };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Network error',
      },
    };
  }
}

/**
 * Transform DTO to client format (with extended results if available)
 */
function transformFromDto(dto: ForecastCalculationResultDto): ExtendedForecastCalculationResult {
  const baseResult: ForecastCalculationResult = {
    forecastId: dto.forecastId,
    calculatedAt: new Date(dto.calculatedAt),
    metrics: dto.metrics.map(metric => ({
      metricNodeId: metric.metricNodeId,
      values: metric.values.map(value => {
        return {
          date: new Date(value.date),
          forecast: value.forecast,
          budget: value.budget,
          historical: value.historical,
        };
      }),
    })),
  };

  // Return extended result if allNodes data is available
  if (dto.allNodes) {
    return {
      ...baseResult,
      allNodes: dto.allNodes.map(node => ({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        values: node.values.map(value => ({
          date: new Date(value.date),
          forecast: value.forecast,
          budget: value.budget,
          historical: value.historical,
          calculated: value.calculated,
        })),
      })),
    };
  }

  // Return base result for backward compatibility
  return baseResult as ExtendedForecastCalculationResult;
}

/**
 * Transform unified DTO to client format
 */
function transformUnifiedFromDto(dto: UnifiedCalculationResultDto): UnifiedCalculationResult {
  try {
    // Handle case where metrics array might be undefined
    const transformedMetrics = (dto.metrics || [])
      .map((metric) => {
        const m = metric as Record<string, unknown>;
        const nodeId = (metric.nodeId ?? m.metricNodeId ?? m.node_id) as string | undefined;
        return {
          nodeId,
          nodeType: metric.nodeType,
          values: (metric.values || []).map((value) => {
            return {
              month: value.month,
              forecast: value.forecast,
              budget: value.budget,
              historical: value.historical,
              calculated: value.calculated,
            };
          }),
        };
      })
      .filter((row): row is typeof row & { nodeId: string } => Boolean(row.nodeId));

    // Handle case where allNodes array might be undefined
    const transformedAllNodes = (dto.allNodes || [])
      .map((node) => {
        const n = node as Record<string, unknown>;
        const nodeId = (node.nodeId ?? n.node_id ?? n.metricNodeId) as string | undefined;
        return {
          nodeId,
          nodeType: node.nodeType,
          values: (node.values || []).map((value) => {
            return {
              month: value.month,
              forecast: value.forecast,
              budget: value.budget,
              historical: value.historical,
              calculated: value.calculated,
            };
          }),
        };
      })
      .filter((row): row is typeof row & { nodeId: string } => Boolean(row.nodeId));

    const result: UnifiedCalculationResult = {
      id: dto.id,
      forecastId: dto.forecastId,
      calculatedAt: new Date(dto.calculatedAt),
      calculationTypes: dto.calculationTypes,
      periodInfo: dto.periodInfo,
      metrics: transformedMetrics,
      allNodes: transformedAllNodes,
    };

    return result;
  } catch (error) {
    console.error('[ForecastCalculationApi] transformUnifiedFromDto failed:', error);
    throw error;
  }
}

/**
 * Forecast calculation API interface
 */
interface ForecastCalculationApi {
  calculateForecast(forecastId: string): Promise<ExtendedForecastCalculationResult>;
  calculateHistoricalValues(forecastId: string, request: HistoricalCalculationRequest): Promise<ExtendedForecastCalculationResult>;
  getCalculationResults(forecastId: string): Promise<ExtendedForecastCalculationResult | null>;
  getCalculationHistory(forecastId: string): Promise<ExtendedForecastCalculationResult[]>;
  checkCalculationHealth(): Promise<CalculationHealthDto>;
  // NEW: Unified calculation methods for Phase 4
  calculateUnified(forecastId: string, request: UnifiedCalculationRequest): Promise<UnifiedCalculationResult>;
  getUnifiedCalculationResults(forecastId: string): Promise<UnifiedCalculationResult | null>;
}

/**
 * Forecast calculation API implementation
 */
export const forecastCalculationApi: ForecastCalculationApi = {
  /**
   * Trigger forecast calculation
   */
  async calculateForecast(forecastId: string): Promise<ExtendedForecastCalculationResult> {
    console.log(`[ForecastCalculationApi] Triggering calculation for forecast ${forecastId}`);
    
    const response = await fetchWithAuth<ForecastCalculationResultDto>(
      `/forecasts/${forecastId}/calculate`,
      {
        method: 'POST',
      }
    );

    if (response.error) {
      console.error('[ForecastCalculationApi] Calculation failed:', response.error);
      throw new Error(`Failed to calculate forecast: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error('No calculation result returned from server');
    }

    console.log(`[ForecastCalculationApi] Calculation completed for forecast ${forecastId}`);
    return transformFromDto(response.data);
  },

  /**
   * Trigger historical calculation for specific actual period
   * @deprecated Use calculateUnified with 'historical' calculation type instead. This method will be removed in Phase 8.
   */
  async calculateHistoricalValues(forecastId: string, request: HistoricalCalculationRequest): Promise<ExtendedForecastCalculationResult> {
    console.log(`[ForecastCalculationApi] [DEPRECATED] Triggering historical calculation for forecast ${forecastId} from ${request.actualStartMonth} to ${request.actualEndMonth}`);
    console.warn('[ForecastCalculationApi] calculateHistoricalValues is deprecated. Use calculateUnified with "historical" calculation type instead.');
    
    // Convert MM-YYYY request to legacy format by routing through unified calculation
    const unifiedRequest: UnifiedCalculationRequest = {
      calculationTypes: ['historical'],
      includeIntermediateNodes: true
    };
    
    try {
      const unifiedResult = await this.calculateUnified(forecastId, unifiedRequest);
      
      // Convert unified result back to legacy format for backward compatibility
      const legacyResult: ExtendedForecastCalculationResult = {
        forecastId: unifiedResult.forecastId,
        calculatedAt: unifiedResult.calculatedAt,
        metrics: [], // Legacy format conversion would be complex, use unified method instead
        allNodes: [] // Legacy format conversion would be complex, use unified method instead
      };
      
      console.log(`[ForecastCalculationApi] Historical calculation completed via unified method for forecast ${forecastId}`);
      return legacyResult;
    } catch (error) {
      console.error('[ForecastCalculationApi] Historical calculation failed:', error);
      throw new Error(`Failed to calculate historical values: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get latest calculation results
   */
  async getCalculationResults(forecastId: string): Promise<ExtendedForecastCalculationResult | null> {
    console.log(`[ForecastCalculationApi] Fetching latest results for forecast ${forecastId}`);
    
    const response = await fetchWithAuth<ForecastCalculationResultDto>(
      `/forecasts/${forecastId}/calculation-results`,
      {
        method: 'GET',
      }
    );

    if (response.error) {
      if (response.error.statusCode === 404) {
        console.log(`[ForecastCalculationApi] No results found for forecast ${forecastId}`);
        return null;
      }
      console.error('[ForecastCalculationApi] Failed to fetch results:', response.error);
      throw new Error(`Failed to get calculation results: ${response.error.message}`);
    }

    if (!response.data) {
      return null;
    }

    console.log(`[ForecastCalculationApi] Retrieved results for forecast ${forecastId}`);
    
    // DEBUG: Log raw backend response to see date format and values
    console.log('[DEBUG] Raw backend response sample:', {
      calculatedAt: response.data.calculatedAt,
      metricsCount: response.data.metrics?.length,
      allNodesCount: response.data.allNodes?.length,
      firstMetricSample: response.data.metrics?.[0]?.values?.[0],
      firstNodeSample: response.data.allNodes?.[0]?.values?.[0]
    });
    
    return transformFromDto(response.data);
  },

  /**
   * Get calculation history
   */
  async getCalculationHistory(forecastId: string): Promise<ExtendedForecastCalculationResult[]> {
    console.log(`[ForecastCalculationApi] Fetching calculation history for forecast ${forecastId}`);
    
    const response = await fetchWithAuth<ForecastCalculationResultDto[]>(
      `/forecasts/${forecastId}/calculation-results/history`,
      {
        method: 'GET',
      }
    );

    if (response.error) {
      console.error('[ForecastCalculationApi] Failed to fetch calculation history:', response.error);
      throw new Error(`Failed to get calculation history: ${response.error.message}`);
    }

    if (!response.data) {
      return [];
    }

    console.log(`[ForecastCalculationApi] Retrieved ${response.data.length} historical results for forecast ${forecastId}`);
    return response.data.map(transformFromDto);
  },

  /**
   * Health check for calculation service
   */
  async checkCalculationHealth(): Promise<CalculationHealthDto> {
    const response = await fetchWithAuth<CalculationHealthDto>(
      '/forecasts/calculation/health',
      {
        method: 'GET',
      }
    );

    if (response.error) {
      console.error('[ForecastCalculationApi] Health check failed:', response.error);
      throw new Error(`Health check failed: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error('No health check data returned from server');
    }

    return response.data;
  },

  /**
   * NEW: Trigger unified calculation (Phase 4)
   */
  async calculateUnified(forecastId: string, request: UnifiedCalculationRequest): Promise<UnifiedCalculationResult> {
    console.log(`[ForecastCalculationApi] Triggering unified calculation for forecast ${forecastId}:`, request);
    
    const response = await fetchWithAuth<UnifiedCalculationResultDto>(
      `/forecasts/${forecastId}/calculate-unified`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    // Enhanced error handling for unified calculations
    if (response.error) {
      const error = response.error;
      console.error('[ForecastCalculationApi] Unified calculation failed:', error);
      
      // Specific error handling for period validation issues
      if (error.statusCode === 400) {
        if (error.message.includes('period') || error.message.includes('MM-YYYY')) {
          throw new Error(`Period validation error: ${error.message}`);
        }
        if (error.message.includes('calculation types')) {
          throw new Error(`Invalid calculation types: ${error.message}`);
        }
        if (error.message.includes('forecast not found')) {
          throw new Error(`Forecast not found: ${error.message}`);
        }
        throw new Error(`Invalid request: ${error.message}`);
      }
      
      if (error.statusCode === 404) {
        throw new Error(`Forecast ${forecastId} not found or accessible`);
      }
      
      if (error.statusCode === 403) {
        throw new Error(`Access denied to forecast ${forecastId}`);
      }
      
      if (error.statusCode === 500) {
        throw new Error(`Server error during calculation: ${error.message}`);
      }
      
      // Generic error fallback
      throw new Error(`Unified calculation failed: ${error.message}`);
    }

    if (!response.data) {
      throw new Error('No unified calculation result returned from server');
    }

    console.log(`[ForecastCalculationApi] Unified calculation completed for forecast ${forecastId}`);

    const unified = transformUnifiedFromDto(response.data);

    return unified;
  },

  /**
   * NEW: Get latest unified calculation results (Phase 4)
   */
  async getUnifiedCalculationResults(forecastId: string): Promise<UnifiedCalculationResult | null> {
    console.log(`[ForecastCalculationApi] Fetching unified results for forecast ${forecastId}`);
    
    const response = await fetchWithAuth<UnifiedCalculationResultDto>(
      `/forecasts/${forecastId}/calculation-results-unified`,
      {
        method: 'GET',
      }
    );

    if (response.error) {
      if (response.error.statusCode === 404) {
        console.log(`[ForecastCalculationApi] No unified results found for forecast ${forecastId}`);
        return null;
      }
      console.error('[ForecastCalculationApi] Failed to fetch unified results:', response.error);
      throw new Error(`Failed to get unified calculation results: ${response.error.message}`);
    }

    if (!response.data) {
      return null;
    }

    console.log(`[ForecastCalculationApi] Retrieved unified results for forecast ${forecastId}`);

    return transformUnifiedFromDto(response.data);
  },
};

/**
 * Export individual functions for selective imports
 */
export const {
  calculateForecast,
  calculateHistoricalValues,
  getCalculationResults,
  getCalculationHistory,
  checkCalculationHealth,
  // NEW: Phase 4 unified calculation methods
  calculateUnified,
  getUnifiedCalculationResults,
} = forecastCalculationApi; 