import { Test, TestingModule } from '@nestjs/testing';
import { ForecastCalculationService } from '../forecast-calculation.service';
import { DataIntakeService } from '../../../data-intake/data-intake.service';
import { ForecastService } from '../forecast.service';
import { ForecastNodeService } from '../forecast-node.service';
import { ForecastEdgeService } from '../forecast-edge.service';
import { SupabaseOptimizedService } from '../../../supabase/supabase-optimized.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';

describe('ForecastCalculationService Integration', () => {
  let service: ForecastCalculationService;
  let forecastService: ForecastService;
  let nodeService: ForecastNodeService;
  let edgeService: ForecastEdgeService;
  let dataIntakeService: DataIntakeService;
  let supabaseService: SupabaseOptimizedService;

  const mockRequest = {
    headers: { authorization: 'Bearer test-token' },
    user: { id: 'test-user-id' },
  } as unknown as Request;

  const testUserId = 'test-user-id';
  const testForecastId = 'test-forecast-id';
  const testOrgId = 'test-org-id';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForecastCalculationService,
        {
          provide: SupabaseOptimizedService,
          useValue: {
            getClientForRequest: jest.fn(),
            storeCalculationResults: jest.fn(),
            getLatestCalculationResults: jest.fn(),
            getCalculationHistory: jest.fn(),
          },
        },
        {
          provide: DataIntakeService,
          useValue: {
            getVariablesByUser: jest.fn(),
          },
        },
        {
          provide: ForecastService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ForecastNodeService,
          useValue: {
            findByForecast: jest.fn(),
          },
        },
        {
          provide: ForecastEdgeService,
          useValue: {
            findByForecast: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ForecastCalculationService>(ForecastCalculationService);
    forecastService = module.get<ForecastService>(ForecastService);
    nodeService = module.get<ForecastNodeService>(ForecastNodeService);
    edgeService = module.get<ForecastEdgeService>(ForecastEdgeService);
    dataIntakeService = module.get<DataIntakeService>(DataIntakeService);
    supabaseService = module.get<SupabaseOptimizedService>(SupabaseOptimizedService);
  });

  describe('calculateForecast - Real Graph Execution', () => {
    const mockForecast = {
      id: testForecastId,
      name: 'Test Forecast',
      forecastStartDate: '2024-01-01',
      forecastEndDate: '2024-03-31',
      organizationId: testOrgId,
    };

    const mockVariables = [
      {
        id: 'var-1',
        name: 'AG_REV_Recurring_All',
        type: 'ACTUAL',
        organization_id: testOrgId,
        values: [
          { date: '2023-10-01', value: 1000 },
          { date: '2023-11-01', value: 1100 },
          { date: '2023-12-01', value: 1200 },
        ],
      },
      {
        id: 'var-2',
        name: 'AG_REV_Budget_Recurring_All',
        type: 'BUDGET',
        organization_id: testOrgId,
        values: [
          { date: '2024-01-01', value: 1300 },
          { date: '2024-02-01', value: 1400 },
          { date: '2024-03-01', value: 1500 },
        ],
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock service dependencies
      (forecastService.findOne as jest.Mock).mockResolvedValue(mockForecast);
      (dataIntakeService.getVariablesByUser as jest.Mock).mockResolvedValue(mockVariables);
      (supabaseService.storeCalculationResults as jest.Mock).mockResolvedValue({ id: 'result-id' });
    });

    it('should execute simple constant to metric calculation', async () => {
      // Setup: Simple graph with CONSTANT -> METRIC
      const mockNodes = [
        {
          id: 'constant-1',
          forecast_id: testForecastId,
          kind: 'CONSTANT',
          attributes: { name: 'Base Value', value: 1000 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'metric-1',
          forecast_id: testForecastId,
          kind: 'METRIC',
          attributes: {
            label: 'Revenue Forecast',
            budgetVariableId: 'var-2',
            historicalVariableId: 'var-1',
            useCalculated: true,
          },
          position: { x: 200, y: 0 },
        },
      ];

      const mockEdges = [
        {
          id: 'edge-1',
          forecast_id: testForecastId,
          source_node_id: 'constant-1',
          target_node_id: 'metric-1',
        },
      ];

      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);

      // Execute
      const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);

      // Verify structure
      expect(result).toBeDefined();
      expect(result.forecastId).toBe(testForecastId);
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].metricNodeId).toBe('metric-1');
      expect(result.metrics[0].values).toHaveLength(3); // 3 months

      // Verify calculated values
      const metricValues = result.metrics[0].values;
      expect(metricValues[0].forecast).toBe(1000); // January: constant value
      expect(metricValues[1].forecast).toBe(1000); // February: constant value
      expect(metricValues[2].forecast).toBe(1000); // March: constant value

      // Verify budget and historical values are fetched
      expect(metricValues[0].budget).toBe(1300);
      expect(metricValues[1].budget).toBe(1400);
      expect(metricValues[2].budget).toBe(1500);
    });

    it('should execute complex operator chain calculation', async () => {
      // Setup: CONSTANT -> OPERATOR -> METRIC
      const mockNodes = [
        {
          id: 'constant-1',
          forecast_id: testForecastId,
          kind: 'CONSTANT',
          attributes: { name: 'Base Value', value: 1000 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'constant-2',
          forecast_id: testForecastId,
          kind: 'CONSTANT',
          attributes: { name: 'Growth Factor', value: 1.1 },
          position: { x: 0, y: 100 },
        },
        {
          id: 'operator-1',
          forecast_id: testForecastId,
          kind: 'OPERATOR',
          attributes: { op: '*', inputOrder: ['constant-1', 'constant-2'] },
          position: { x: 200, y: 50 },
        },
        {
          id: 'metric-1',
          forecast_id: testForecastId,
          kind: 'METRIC',
          attributes: {
            label: 'Growth Revenue',
            budgetVariableId: 'var-2',
            historicalVariableId: 'var-1',
            useCalculated: true,
          },
          position: { x: 400, y: 50 },
        },
      ];

      const mockEdges = [
        {
          id: 'edge-1',
          forecast_id: testForecastId,
          source_node_id: 'constant-1',
          target_node_id: 'operator-1',
        },
        {
          id: 'edge-2',
          forecast_id: testForecastId,
          source_node_id: 'constant-2',
          target_node_id: 'operator-1',
        },
        {
          id: 'edge-3',
          forecast_id: testForecastId,
          source_node_id: 'operator-1',
          target_node_id: 'metric-1',
        },
      ];

      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);

      // Execute
      const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);

      // Verify calculation results
      expect(result.metrics).toHaveLength(1);
      const metricValues = result.metrics[0].values;
      
      // Should calculate 1000 * 1.1 = 1100 for all months
      expect(metricValues[0].forecast).toBe(1100);
      expect(metricValues[1].forecast).toBe(1100);
      expect(metricValues[2].forecast).toBe(1100);
    });

    it('should execute SEED node with time dependencies', async () => {
      // Setup: SEED -> OPERATOR -> METRIC (time-dependent calculation)
      const mockNodes = [
        {
          id: 'seed-1',
          forecast_id: testForecastId,
          kind: 'SEED',
          attributes: { metricNodeId: 'metric-1' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'constant-1',
          forecast_id: testForecastId,
          kind: 'CONSTANT',
          attributes: { name: 'Growth Rate', value: 0.05 },
          position: { x: 0, y: 100 },
        },
        {
          id: 'operator-1',
          forecast_id: testForecastId,
          kind: 'OPERATOR',
          attributes: { op: '+', inputOrder: ['seed-1', 'constant-1'] },
          position: { x: 200, y: 50 },
        },
        {
          id: 'operator-2',
          forecast_id: testForecastId,
          kind: 'OPERATOR',
          attributes: { op: '*', inputOrder: ['seed-1', 'operator-1'] },
          position: { x: 400, y: 50 },
        },
        {
          id: 'metric-1',
          forecast_id: testForecastId,
          kind: 'METRIC',
          attributes: {
            label: 'Compound Growth',
            budgetVariableId: 'var-2',
            historicalVariableId: 'var-1',
            useCalculated: true,
          },
          position: { x: 600, y: 50 },
        },
      ];

      const mockEdges = [
        { id: 'edge-1', forecast_id: testForecastId, source_node_id: 'seed-1', target_node_id: 'operator-1' },
        { id: 'edge-2', forecast_id: testForecastId, source_node_id: 'constant-1', target_node_id: 'operator-1' },
        { id: 'edge-3', forecast_id: testForecastId, source_node_id: 'seed-1', target_node_id: 'operator-2' },
        { id: 'edge-4', forecast_id: testForecastId, source_node_id: 'operator-1', target_node_id: 'operator-2' },
        { id: 'edge-5', forecast_id: testForecastId, source_node_id: 'operator-2', target_node_id: 'metric-1' },
      ];

      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);

      // Execute
      const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);

      // Verify time-dependent calculations
      expect(result.metrics).toHaveLength(1);
      const metricValues = result.metrics[0].values;
      
      // First month should use historical data (1200 from December 2023)
      expect(metricValues[0].forecast).toBeCloseTo(1260, 2); // 1200 * (1 + 0.05) = 1260
      
      // Subsequent months should compound: value * (value + 0.05)
      expect(metricValues[1].forecast).toBeCloseTo(1333.8, 1); // 1260 * (1260 + 0.05)
      expect(metricValues[2].forecast).toBeGreaterThan(1333.8); // Should be even higher
    });

    it('should handle DATA node variable references', async () => {
      // Setup: DATA -> METRIC
      const mockNodes = [
        {
          id: 'data-1',
          forecast_id: testForecastId,
          kind: 'DATA',
          attributes: { variableId: 'var-1', timeOffset: 0 },
          position: { x: 0, y: 0 },
        },
        {
          id: 'metric-1',
          forecast_id: testForecastId,
          kind: 'METRIC',
          attributes: {
            label: 'Data Driven Forecast',
            budgetVariableId: 'var-2',
            historicalVariableId: 'var-1',
            useCalculated: true,
          },
          position: { x: 200, y: 0 },
        },
      ];

      const mockEdges = [
        {
          id: 'edge-1',
          forecast_id: testForecastId,
          source_node_id: 'data-1',
          target_node_id: 'metric-1',
        },
      ];

      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);

      // Execute
      const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);

      // Verify data variable usage
      expect(result.metrics).toHaveLength(1);
      const metricValues = result.metrics[0].values;
      
      // Should use actual historical values from variable
      expect(metricValues[0].forecast).toBe(1000); // Oct 2023 value
      expect(metricValues[1].forecast).toBe(1100); // Nov 2023 value
      expect(metricValues[2].forecast).toBe(1200); // Dec 2023 value
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle missing forecast', async () => {
      (forecastService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.calculateForecast('non-existent-forecast', testUserId, mockRequest)
      ).rejects.toThrow('Forecast not found');
    });

    it('should handle invalid graph structure', async () => {
      const mockForecast = {
        id: testForecastId,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-03-31',
        organizationId: testOrgId,
      };

      // Graph with cycle
      const mockNodes = [
        {
          id: 'operator-1',
          kind: 'OPERATOR',
          attributes: { op: '+', inputOrder: ['operator-2'] },
        },
        {
          id: 'operator-2',
          kind: 'OPERATOR',
          attributes: { op: '*', inputOrder: ['operator-1'] },
        },
      ];

      const mockEdges = [
        { id: 'edge-1', source_node_id: 'operator-1', target_node_id: 'operator-2' },
        { id: 'edge-2', source_node_id: 'operator-2', target_node_id: 'operator-1' },
      ];

      (forecastService.findOne as jest.Mock).mockResolvedValue(mockForecast);
      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);
      (dataIntakeService.getVariablesByUser as jest.Mock).mockResolvedValue([]);

      await expect(
        service.calculateForecast(testForecastId, testUserId, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle missing variable data', async () => {
      const mockForecast = {
        id: testForecastId,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-03-31',
        organizationId: testOrgId,
      };

      const mockNodes = [
        {
          id: 'data-1',
          kind: 'DATA',
          attributes: { variableId: 'non-existent-var', timeOffset: 0 },
        },
        {
          id: 'metric-1',
          kind: 'METRIC',
          attributes: { label: 'Test', budgetVariableId: '', historicalVariableId: '', useCalculated: true },
        },
      ];

      const mockEdges = [
        { id: 'edge-1', source_node_id: 'data-1', target_node_id: 'metric-1' },
      ];

      (forecastService.findOne as jest.Mock).mockResolvedValue(mockForecast);
      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);
      (dataIntakeService.getVariablesByUser as jest.Mock).mockResolvedValue([]);

      await expect(
        service.calculateForecast(testForecastId, testUserId, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large graphs with 50+ nodes', async () => {
      const mockForecast = {
        id: testForecastId,
        forecastStartDate: '2024-01-01',
        forecastEndDate: '2024-03-31',
        organizationId: testOrgId,
      };

      // Generate a large graph: 50 constants -> 25 operators -> 1 metric
      const mockNodes = [];
      const mockEdges = [];

      // Create 50 constant nodes
      for (let i = 0; i < 50; i++) {
        mockNodes.push({
          id: `constant-${i}`,
          kind: 'CONSTANT',
          attributes: { name: `Constant ${i}`, value: i + 1 },
        });
      }

      // Create 25 operator nodes (each adds 2 constants)
      for (let i = 0; i < 25; i++) {
        mockNodes.push({
          id: `operator-${i}`,
          kind: 'OPERATOR',
          attributes: { op: '+', inputOrder: [`constant-${i * 2}`, `constant-${i * 2 + 1}`] },
        });

        // Add edges from constants to operators
        mockEdges.push({
          id: `edge-${i * 2}`,
          source_node_id: `constant-${i * 2}`,
          target_node_id: `operator-${i}`,
        });
        mockEdges.push({
          id: `edge-${i * 2 + 1}`,
          source_node_id: `constant-${i * 2 + 1}`,
          target_node_id: `operator-${i}`,
        });
      }

      // Create final aggregation operator
      mockNodes.push({
        id: 'final-operator',
        kind: 'OPERATOR',
        attributes: { op: '+', inputOrder: Array.from({ length: 25 }, (_, i) => `operator-${i}`) },
      });

      // Connect all operators to final operator
      for (let i = 0; i < 25; i++) {
        mockEdges.push({
          id: `final-edge-${i}`,
          source_node_id: `operator-${i}`,
          target_node_id: 'final-operator',
        });
      }

      // Create metric node
      mockNodes.push({
        id: 'metric-1',
        kind: 'METRIC',
        attributes: { label: 'Large Graph Result', budgetVariableId: '', historicalVariableId: '', useCalculated: true },
      });

      mockEdges.push({
        id: 'final-metric-edge',
        source_node_id: 'final-operator',
        target_node_id: 'metric-1',
      });

      (forecastService.findOne as jest.Mock).mockResolvedValue(mockForecast);
      (nodeService.findByForecast as jest.Mock).mockResolvedValue(mockNodes);
      (edgeService.findByForecast as jest.Mock).mockResolvedValue(mockEdges);
      (dataIntakeService.getVariablesByUser as jest.Mock).mockResolvedValue([]);
      (supabaseService.storeCalculationResults as jest.Mock).mockResolvedValue({ id: 'result-id' });

      const startTime = Date.now();
      const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);
      const endTime = Date.now();

      // Verify result correctness
      expect(result.metrics).toHaveLength(1);
      
      // Expected result: sum of pairs (1+2) + (3+4) + ... + (49+50) = 1275
      const expectedSum = 1275;
      expect(result.metrics[0].values[0].forecast).toBe(expectedSum);

      // Verify reasonable performance (should complete within 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
}); 