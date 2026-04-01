"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const calculation_engine_core_1 = require("../calculation-engine-core");
const calculation_engine_core_module_1 = require("../calculation-engine-core.module");
describe('CalculationEngineCore', () => {
    let engine;
    let module;
    beforeEach(async () => {
        module = await testing_1.Test.createTestingModule({
            imports: [calculation_engine_core_module_1.CalculationEngineCoreModule],
        }).compile();
        engine = module.get(calculation_engine_core_1.CalculationEngineCore);
    });
    afterEach(async () => {
        await module.close();
    });
    describe('Basic Functionality', () => {
        it('should be defined', () => {
            expect(engine).toBeDefined();
        });
        it('should return engine statistics', () => {
            const stats = engine.getStats();
            expect(stats).toHaveProperty('supportedCalculationTypes');
            expect(stats).toHaveProperty('supportedNodeTypes');
            expect(stats).toHaveProperty('cacheStats');
            expect(stats.supportedCalculationTypes).toEqual(['historical', 'forecast', 'budget']);
            expect(stats.supportedNodeTypes).toContain('DATA');
            expect(stats.supportedNodeTypes).toContain('CONSTANT');
            expect(stats.supportedNodeTypes).toContain('OPERATOR');
            expect(stats.supportedNodeTypes).toContain('METRIC');
            expect(stats.supportedNodeTypes).toContain('SEED');
        });
        it('should clear caches', () => {
            expect(() => engine.clearCaches()).not.toThrow();
        });
    });
    describe('Request Validation', () => {
        it('should validate a basic request structure', async () => {
            const request = {
                trees: [],
                periods: {
                    forecast: { start: '01-2025', end: '12-2025' },
                    actual: { start: '01-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: false,
                variables: []
            };
            const validation = await engine.validateRequest(request);
            expect(validation).toHaveProperty('isValid');
            expect(validation).toHaveProperty('errors');
            expect(validation).toHaveProperty('warnings');
        });
        it('should reject invalid calculation types', async () => {
            const request = {
                trees: [],
                periods: {
                    forecast: { start: '01-2025', end: '12-2025' },
                    actual: { start: '01-2024', end: '12-2024' }
                },
                calculationTypes: ['invalid'],
                includeAllNodes: false,
                variables: []
            };
            const validation = await engine.validateRequest(request);
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain(expect.stringContaining('Invalid calculation types'));
        });
        it('should reject invalid period formats', async () => {
            const request = {
                trees: [],
                periods: {
                    forecast: { start: 'invalid', end: '12-2025' },
                    actual: { start: '01-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: false,
                variables: []
            };
            const validation = await engine.validateRequest(request);
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain(expect.stringContaining('Invalid forecast start period format'));
        });
    });
    describe('Dry Run', () => {
        it('should perform dry run validation', async () => {
            const request = {
                trees: createSimpleMetricTree(),
                periods: {
                    forecast: { start: '01-2025', end: '03-2025' },
                    actual: { start: '10-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: true,
                variables: createTestVariables()
            };
            const dryRun = await engine.dryRun(request);
            expect(dryRun).toHaveProperty('isValid');
            expect(dryRun).toHaveProperty('estimatedNodes');
            expect(dryRun).toHaveProperty('estimatedMonths');
            if (dryRun.isValid) {
                expect(dryRun.estimatedNodes).toBeGreaterThan(0);
                expect(dryRun.estimatedMonths).toBeGreaterThan(0);
            }
        });
    });
    describe('Simple Calculations', () => {
        it('should calculate a constant node', async () => {
            const constantTree = createConstantTree();
            const request = {
                trees: [constantTree],
                periods: {
                    forecast: { start: '01-2025', end: '02-2025' },
                    actual: { start: '11-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: true,
                variables: []
            };
            const result = await engine.calculate(request);
            expect(result).toBeDefined();
            expect(result.nodeResults).toHaveLength(2);
            const constantNode = result.nodeResults.find(n => n.nodeType === 'CONSTANT');
            expect(constantNode).toBeDefined();
            expect(constantNode.values).toHaveLength(2);
            expect(constantNode.values[0].forecast).toBe(100000);
            expect(constantNode.values[0].calculated).toBe(100000);
        });
        it('should calculate a data node with variables', async () => {
            const dataTree = createDataTree();
            const variables = createTestVariables();
            const request = {
                trees: [dataTree],
                periods: {
                    forecast: { start: '01-2025', end: '02-2025' },
                    actual: { start: '11-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: true,
                variables
            };
            const result = await engine.calculate(request);
            expect(result).toBeDefined();
            expect(result.nodeResults).toHaveLength(2);
            const dataNode = result.nodeResults.find(n => n.nodeType === 'DATA');
            expect(dataNode).toBeDefined();
            expect(dataNode.values).toHaveLength(2);
        });
        it('should calculate an operator node', async () => {
            const operatorTree = createOperatorTree();
            const request = {
                trees: [operatorTree],
                periods: {
                    forecast: { start: '01-2025', end: '02-2025' },
                    actual: { start: '11-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: true,
                variables: []
            };
            const result = await engine.calculate(request);
            expect(result).toBeDefined();
            expect(result.nodeResults).toHaveLength(4);
            const operatorNode = result.nodeResults.find(n => n.nodeType === 'OPERATOR');
            expect(operatorNode).toBeDefined();
            expect(operatorNode.values[0].forecast).toBe(150000);
            expect(operatorNode.values[0].calculated).toBe(150000);
        });
    });
    describe('Multiple Calculation Types', () => {
        it('should calculate multiple types in single request', async () => {
            const tree = createConstantTree();
            const request = {
                trees: [tree],
                periods: {
                    forecast: { start: '01-2025', end: '02-2025' },
                    actual: { start: '11-2024', end: '12-2024' }
                },
                calculationTypes: ['historical', 'forecast', 'budget'],
                includeAllNodes: true,
                variables: []
            };
            const result = await engine.calculate(request);
            expect(result).toBeDefined();
            expect(result.calculationTypes).toEqual(['historical', 'forecast', 'budget']);
            const constantNode = result.nodeResults.find(n => n.nodeType === 'CONSTANT');
            expect(constantNode).toBeDefined();
            const forecastMonthValue = constantNode.values.find(v => v.month === '01-2025');
            expect(forecastMonthValue).toBeDefined();
            expect(forecastMonthValue.forecast).toBe(100000);
            expect(forecastMonthValue.budget).toBe(100000);
            const actualMonthValue = constantNode.values.find(v => v.month === '12-2024');
            expect(actualMonthValue).toBeDefined();
            expect(actualMonthValue.historical).toBe(100000);
        });
    });
    describe('Error Handling', () => {
        it('should handle missing variables gracefully', async () => {
            const dataTree = createDataTree();
            const request = {
                trees: [dataTree],
                periods: {
                    forecast: { start: '01-2025', end: '01-2025' },
                    actual: { start: '12-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: true,
                variables: []
            };
            const result = await engine.calculate(request);
            expect(result).toBeDefined();
            const dataNode = result.nodeResults.find(n => n.nodeType === 'DATA');
            expect(dataNode).toBeDefined();
            expect(dataNode.values[0].forecast).toBeNull();
        });
        it('should handle circular dependencies', async () => {
            const request = {
                trees: [],
                periods: {
                    forecast: { start: '01-2025', end: '01-2025' },
                    actual: { start: '12-2024', end: '12-2024' }
                },
                calculationTypes: ['forecast'],
                includeAllNodes: true,
                variables: []
            };
            await expect(engine.calculate(request)).rejects.toThrow();
        });
    });
    function createSimpleMetricTree() {
        const constantNode = {
            nodeId: 'constant-1',
            nodeType: 'CONSTANT',
            nodeData: { name: 'Test Constant', value: 100000 },
            children: []
        };
        const metricNode = {
            nodeId: 'metric-1',
            nodeType: 'METRIC',
            nodeData: {
                label: 'Test Metric',
                budgetVariableId: '',
                historicalVariableId: '',
                useCalculated: true
            },
            children: [constantNode]
        };
        return [{
                rootMetricNodeId: 'metric-1',
                tree: metricNode
            }];
    }
    function createConstantTree() {
        const constantNode = {
            nodeId: 'constant-1',
            nodeType: 'CONSTANT',
            nodeData: { name: 'Test Constant', value: 100000 },
            children: []
        };
        const metricNode = {
            nodeId: 'metric-1',
            nodeType: 'METRIC',
            nodeData: {
                label: 'Test Metric',
                budgetVariableId: '',
                historicalVariableId: '',
                useCalculated: true
            },
            children: [constantNode]
        };
        return {
            rootMetricNodeId: 'metric-1',
            tree: metricNode
        };
    }
    function createDataTree() {
        const dataNode = {
            nodeId: 'data-1',
            nodeType: 'DATA',
            nodeData: {
                name: 'Test Data',
                variableId: 'var-1',
                offsetMonths: 0
            },
            children: []
        };
        const metricNode = {
            nodeId: 'metric-1',
            nodeType: 'METRIC',
            nodeData: {
                label: 'Test Metric',
                budgetVariableId: '',
                historicalVariableId: '',
                useCalculated: true
            },
            children: [dataNode]
        };
        return {
            rootMetricNodeId: 'metric-1',
            tree: metricNode
        };
    }
    function createOperatorTree() {
        const constant1 = {
            nodeId: 'constant-1',
            nodeType: 'CONSTANT',
            nodeData: { name: 'Constant 1', value: 100000 },
            children: []
        };
        const constant2 = {
            nodeId: 'constant-2',
            nodeType: 'CONSTANT',
            nodeData: { name: 'Constant 2', value: 50000 },
            children: []
        };
        const operatorNode = {
            nodeId: 'operator-1',
            nodeType: 'OPERATOR',
            nodeData: {
                op: '+',
                inputOrder: ['constant-1', 'constant-2']
            },
            children: [constant1, constant2]
        };
        const metricNode = {
            nodeId: 'metric-1',
            nodeType: 'METRIC',
            nodeData: {
                label: 'Test Metric',
                budgetVariableId: '',
                historicalVariableId: '',
                useCalculated: true
            },
            children: [operatorNode]
        };
        return {
            rootMetricNodeId: 'metric-1',
            tree: metricNode
        };
    }
    function createTestVariables() {
        return [
            {
                id: 'var-1',
                name: 'Test Variable 1',
                type: 'ACTUAL',
                organizationId: 'org-1',
                timeSeries: [
                    { date: new Date('2024-12-01'), value: 75000 },
                    { date: new Date('2025-01-01'), value: 80000 },
                    { date: new Date('2025-02-01'), value: 85000 }
                ]
            }
        ];
    }
});
//# sourceMappingURL=calculation-engine-core.test.js.map