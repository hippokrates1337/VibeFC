import type { ForecastCalculationResult, ExtendedForecastCalculationResult } from '@/types/forecast';

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
      values: metric.values.map(value => ({
        date: new Date(value.date),
        forecast: value.forecast,
        budget: value.budget,
        historical: value.historical,
      })),
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
 * Forecast calculation API interface
 */
interface ForecastCalculationApi {
  calculateForecast(forecastId: string): Promise<ExtendedForecastCalculationResult>;
  getCalculationResults(forecastId: string): Promise<ExtendedForecastCalculationResult | null>;
  getCalculationHistory(forecastId: string): Promise<ExtendedForecastCalculationResult[]>;
  checkCalculationHealth(): Promise<CalculationHealthDto>;
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
};

/**
 * Export individual functions for selective imports
 */
export const {
  calculateForecast,
  getCalculationResults,
  getCalculationHistory,
  checkCalculationHealth,
} = forecastCalculationApi; 