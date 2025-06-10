import { forecastCalculationApi } from '../forecast-calculation';

// Mock the environment variable before the module is loaded
const mockBackendUrl = 'http://localhost:3001';
jest.mock('../forecast-calculation', () => {
  // Set the env var before requiring the actual module
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  const actualModule = jest.requireActual('../forecast-calculation');
  return actualModule;
});

// Mock the global fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock document.cookie for auth token
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'sb-access-token=test-token',
});

describe('ForecastCalculationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    process.env.NEXT_PUBLIC_BACKEND_URL = mockBackendUrl;
  });

  describe('calculateForecast', () => {
    it('should successfully trigger forecast calculation', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00Z',
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: '2024-01-01T00:00:00Z',
                forecast: 1000,
                budget: 1100,
                historical: 950,
              },
              {
                date: '2024-02-01T00:00:00Z',
                forecast: 1050,
                budget: 1150,
                historical: 1000,
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.calculateForecast(forecastId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/forecasts/${forecastId}/calculate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      );

      // Verify headers separately
      const actualCall = mockFetch.mock.calls[0];
      const headers = actualCall[1]?.headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe('Bearer test-token');

      expect(result).toEqual({
        forecastId: 'test-forecast-id',
        calculatedAt: new Date('2024-01-15T10:30:00Z'),
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: new Date('2024-01-01T00:00:00Z'),
                forecast: 1000,
                budget: 1100,
                historical: 950,
              },
              {
                date: new Date('2024-02-01T00:00:00Z'),
                forecast: 1050,
                budget: 1150,
                historical: 1000,
              },
            ],
          },
        ],
      });
    });

    it('should handle calculation failure with error message', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ message: 'Graph validation failed: Missing required nodes' })),
      } as Response);

      await expect(
        forecastCalculationApi.calculateForecast(forecastId)
      ).rejects.toThrow('Failed to calculate forecast: Graph validation failed: Missing required nodes');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/forecasts/${forecastId}/calculate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      );
    });

    it('should handle no data returned from server', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      } as Response);

      await expect(
        forecastCalculationApi.calculateForecast(forecastId)
      ).rejects.toThrow('No calculation result returned from server');
    });

    it('should handle network or server errors', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        forecastCalculationApi.calculateForecast(forecastId)
      ).rejects.toThrow('Network error');
    });
  });

  describe('getCalculationResults', () => {
    it('should successfully retrieve latest calculation results', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00Z',
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: '2024-01-01T00:00:00Z',
                forecast: 1000,
                budget: 1100,
                historical: 950,
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.getCalculationResults(forecastId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/forecasts/${forecastId}/calculation-results`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );

      expect(result).toEqual({
        forecastId: 'test-forecast-id',
        calculatedAt: new Date('2024-01-15T10:30:00Z'),
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: new Date('2024-01-01T00:00:00Z'),
                forecast: 1000,
                budget: 1100,
                historical: 950,
              },
            ],
          },
        ],
      });
    });

    it('should return null when no calculation results exist', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      } as Response);

      const result = await forecastCalculationApi.getCalculationResults(forecastId);

      expect(result).toBeNull();
    });

    it('should return null when forecast not found (404)', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ message: 'Forecast not found' })),
      } as Response);

      const result = await forecastCalculationApi.getCalculationResults(forecastId);

      expect(result).toBeNull();
    });

    it('should throw error for non-404 API errors', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ message: 'Internal server error' })),
      } as Response);

      await expect(
        forecastCalculationApi.getCalculationResults(forecastId)
      ).rejects.toThrow('Failed to get calculation results: Internal server error');
    });
  });

  describe('getCalculationHistory', () => {
    it('should successfully retrieve calculation history', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = [
        {
          id: 'result-1',
          forecastId: 'test-forecast-id',
          calculatedAt: '2024-01-15T10:30:00Z',
          metrics: [
            {
              metricNodeId: 'metric-1',
              values: [
                {
                  date: '2024-01-01T00:00:00Z',
                  forecast: 1000,
                  budget: 1100,
                  historical: 950,
                },
              ],
            },
          ],
        },
        {
          id: 'result-2',
          forecastId: 'test-forecast-id',
          calculatedAt: '2024-01-14T09:15:00Z',
          metrics: [
            {
              metricNodeId: 'metric-1',
              values: [
                {
                  date: '2024-01-01T00:00:00Z',
                  forecast: 950,
                  budget: 1100,
                  historical: 950,
                },
              ],
            },
          ],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.getCalculationHistory(forecastId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/forecasts/${forecastId}/calculation-results/history`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].calculatedAt).toEqual(new Date('2024-01-15T10:30:00Z'));
      expect(result[1].calculatedAt).toEqual(new Date('2024-01-14T09:15:00Z'));
    });

    it('should return empty array when no history exists', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([])),
      } as Response);

      const result = await forecastCalculationApi.getCalculationHistory(forecastId);

      expect(result).toEqual([]);
    });

    it('should handle API errors when retrieving history', async () => {
      const forecastId = 'test-forecast-id';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ message: 'Access denied' })),
      } as Response);

      await expect(
        forecastCalculationApi.getCalculationHistory(forecastId)
      ).rejects.toThrow('Failed to get calculation history: Access denied');
    });
  });

  describe('checkCalculationHealth', () => {
    it('should successfully check calculation engine health', async () => {
      const mockResponseData = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.checkCalculationHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/forecasts/calculation/health`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );

      expect(result).toEqual({
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00Z',
      });
    });

    it('should handle health check failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve(JSON.stringify({ message: 'Service unavailable' })),
      } as Response);

      await expect(
        forecastCalculationApi.checkCalculationHealth()
      ).rejects.toThrow('Health check failed: Service unavailable');
    });

    it('should handle degraded service status', async () => {
      const mockResponseData = {
        status: 'degraded',
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.checkCalculationHealth();

      expect(result.status).toBe('degraded');
      expect(result.timestamp).toBe('2024-01-15T10:30:00Z');
    });
  });

  describe('date transformation', () => {
    it('should correctly transform ISO date strings to Date objects', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00.123Z',
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: '2024-01-01T00:00:00.000Z',
                forecast: 1000,
                budget: 1100,
                historical: 950,
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.calculateForecast(forecastId);

      // Verify precise date transformation
      expect(result.calculatedAt).toEqual(new Date('2024-01-15T10:30:00.123Z'));
      expect(result.metrics[0].values[0].date).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('should handle invalid date strings gracefully', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: 'invalid-date',
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: 'also-invalid',
                forecast: 1000,
                budget: 1100,
                historical: 950,
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.calculateForecast(forecastId);

      // Invalid dates should be converted to Invalid Date objects
      expect(result.calculatedAt.toString()).toBe('Invalid Date');
      expect(result.metrics[0].values[0].date.toString()).toBe('Invalid Date');
    });
  });

  describe('error edge cases', () => {
    it('should handle empty metrics array', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00Z',
        metrics: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.calculateForecast(forecastId);

      expect(result.metrics).toEqual([]);
    });

    it('should handle metrics with empty values arrays', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00Z',
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.calculateForecast(forecastId);

      expect(result.metrics[0].values).toEqual([]);
    });

    it('should handle null/undefined values in metric data', async () => {
      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00Z',
        metrics: [
          {
            metricNodeId: 'metric-1',
            values: [
              {
                date: '2024-01-01T00:00:00Z',
                forecast: null,
                budget: undefined,
                historical: 950,
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      const result = await forecastCalculationApi.calculateForecast(forecastId);

      expect(result.metrics[0].values[0].forecast).toBeNull();
      expect(result.metrics[0].values[0].budget).toBeUndefined();
      expect(result.metrics[0].values[0].historical).toBe(950);
    });
  });

  describe('authentication', () => {
    it('should work without auth token when cookie is not present', async () => {
      // Remove the cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });

      const forecastId = 'test-forecast-id';
      const mockResponseData = {
        id: 'result-id',
        forecastId: 'test-forecast-id',
        calculatedAt: '2024-01-15T10:30:00Z',
        metrics: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponseData)),
      } as Response);

      await forecastCalculationApi.calculateForecast(forecastId);

      // Verify no Authorization header is sent
      const actualCall = mockFetch.mock.calls[0];
      const headers = actualCall[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('Content-Type')).toBe('application/json');

      // Restore cookie for other tests
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'sb-access-token=test-token',
      });
    });
  });
}); 