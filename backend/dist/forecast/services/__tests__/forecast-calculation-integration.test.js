"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const forecast_calculation_service_1 = require("../forecast-calculation.service");
const data_intake_service_1 = require("../../../data-intake/data-intake.service");
const forecast_service_1 = require("../forecast.service");
const forecast_node_service_1 = require("../forecast-node.service");
const forecast_edge_service_1 = require("../forecast-edge.service");
const supabase_optimized_service_1 = require("../../../supabase/supabase-optimized.service");
const common_1 = require("@nestjs/common");
describe('ForecastCalculationService Integration', () => {
    let service;
    let forecastService;
    let nodeService;
    let edgeService;
    let dataIntakeService;
    let supabaseService;
    const mockRequest = {
        headers: { authorization: 'Bearer test-token' },
        user: { id: 'test-user-id' },
    };
    const testUserId = 'test-user-id';
    const testForecastId = 'test-forecast-id';
    const testOrgId = 'test-org-id';
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                forecast_calculation_service_1.ForecastCalculationService,
                {
                    provide: supabase_optimized_service_1.SupabaseOptimizedService,
                    useValue: {
                        getClientForRequest: jest.fn(),
                        storeCalculationResults: jest.fn(),
                        getLatestCalculationResults: jest.fn(),
                        getCalculationHistory: jest.fn(),
                    },
                },
                {
                    provide: data_intake_service_1.DataIntakeService,
                    useValue: {
                        getVariablesByUser: jest.fn(),
                    },
                },
                {
                    provide: forecast_service_1.ForecastService,
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: forecast_node_service_1.ForecastNodeService,
                    useValue: {
                        findByForecast: jest.fn(),
                    },
                },
                {
                    provide: forecast_edge_service_1.ForecastEdgeService,
                    useValue: {
                        findByForecast: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(forecast_calculation_service_1.ForecastCalculationService);
        forecastService = module.get(forecast_service_1.ForecastService);
        nodeService = module.get(forecast_node_service_1.ForecastNodeService);
        edgeService = module.get(forecast_edge_service_1.ForecastEdgeService);
        dataIntakeService = module.get(data_intake_service_1.DataIntakeService);
        supabaseService = module.get(supabase_optimized_service_1.SupabaseOptimizedService);
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
            forecastService.findOne.mockResolvedValue(mockForecast);
            dataIntakeService.getVariablesByUser.mockResolvedValue(mockVariables);
            supabaseService.storeCalculationResults.mockResolvedValue({ id: 'result-id' });
        });
        it('should execute simple constant to metric calculation', async () => {
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
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);
            expect(result).toBeDefined();
            expect(result.forecastId).toBe(testForecastId);
            expect(result.metrics).toHaveLength(1);
            expect(result.metrics[0].metricNodeId).toBe('metric-1');
            expect(result.metrics[0].values).toHaveLength(3);
            const metricValues = result.metrics[0].values;
            expect(metricValues[0].forecast).toBe(1000);
            expect(metricValues[1].forecast).toBe(1000);
            expect(metricValues[2].forecast).toBe(1000);
            expect(metricValues[0].budget).toBe(1300);
            expect(metricValues[1].budget).toBe(1400);
            expect(metricValues[2].budget).toBe(1500);
        });
        it('should execute complex operator chain calculation', async () => {
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
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);
            expect(result.metrics).toHaveLength(1);
            const metricValues = result.metrics[0].values;
            expect(metricValues[0].forecast).toBe(1100);
            expect(metricValues[1].forecast).toBe(1100);
            expect(metricValues[2].forecast).toBe(1100);
        });
        it('should execute SEED node with time dependencies', async () => {
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
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);
            expect(result.metrics).toHaveLength(1);
            const metricValues = result.metrics[0].values;
            expect(metricValues[0].forecast).toBeCloseTo(1260, 2);
            expect(metricValues[1].forecast).toBeCloseTo(1333.8, 1);
            expect(metricValues[2].forecast).toBeGreaterThan(1333.8);
        });
        it('should handle DATA node variable references', async () => {
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
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);
            expect(result.metrics).toHaveLength(1);
            const metricValues = result.metrics[0].values;
            expect(metricValues[0].forecast).toBe(1000);
            expect(metricValues[1].forecast).toBe(1100);
            expect(metricValues[2].forecast).toBe(1200);
        });
    });
    describe('Error Handling Integration', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it('should handle missing forecast', async () => {
            forecastService.findOne.mockResolvedValue(null);
            await expect(service.calculateForecast('non-existent-forecast', testUserId, mockRequest)).rejects.toThrow('Forecast not found');
        });
        it('should handle invalid graph structure', async () => {
            const mockForecast = {
                id: testForecastId,
                forecastStartDate: '2024-01-01',
                forecastEndDate: '2024-03-31',
                organizationId: testOrgId,
            };
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
            forecastService.findOne.mockResolvedValue(mockForecast);
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            dataIntakeService.getVariablesByUser.mockResolvedValue([]);
            await expect(service.calculateForecast(testForecastId, testUserId, mockRequest)).rejects.toThrow(common_1.BadRequestException);
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
            forecastService.findOne.mockResolvedValue(mockForecast);
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            dataIntakeService.getVariablesByUser.mockResolvedValue([]);
            await expect(service.calculateForecast(testForecastId, testUserId, mockRequest)).rejects.toThrow(common_1.BadRequestException);
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
            const mockNodes = [];
            const mockEdges = [];
            for (let i = 0; i < 50; i++) {
                mockNodes.push({
                    id: `constant-${i}`,
                    kind: 'CONSTANT',
                    attributes: { name: `Constant ${i}`, value: i + 1 },
                });
            }
            for (let i = 0; i < 25; i++) {
                mockNodes.push({
                    id: `operator-${i}`,
                    kind: 'OPERATOR',
                    attributes: { op: '+', inputOrder: [`constant-${i * 2}`, `constant-${i * 2 + 1}`] },
                });
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
            mockNodes.push({
                id: 'final-operator',
                kind: 'OPERATOR',
                attributes: { op: '+', inputOrder: Array.from({ length: 25 }, (_, i) => `operator-${i}`) },
            });
            for (let i = 0; i < 25; i++) {
                mockEdges.push({
                    id: `final-edge-${i}`,
                    source_node_id: `operator-${i}`,
                    target_node_id: 'final-operator',
                });
            }
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
            forecastService.findOne.mockResolvedValue(mockForecast);
            nodeService.findByForecast.mockResolvedValue(mockNodes);
            edgeService.findByForecast.mockResolvedValue(mockEdges);
            dataIntakeService.getVariablesByUser.mockResolvedValue([]);
            supabaseService.storeCalculationResults.mockResolvedValue({ id: 'result-id' });
            const startTime = Date.now();
            const result = await service.calculateForecast(testForecastId, testUserId, mockRequest);
            const endTime = Date.now();
            expect(result.metrics).toHaveLength(1);
            const expectedSum = 1275;
            expect(result.metrics[0].values[0].forecast).toBe(expectedSum);
            expect(endTime - startTime).toBeLessThan(5000);
        });
    });
});
//# sourceMappingURL=forecast-calculation-integration.test.js.map