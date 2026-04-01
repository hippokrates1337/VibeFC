import { CalculationEngine } from '../calculation-engine/calculation-engine';
import { VariableDataService } from '../calculation-engine/variable-data-service';
import { GraphConverter } from '../calculation-engine/graph-converter';
import { Variable, CalculationTree } from '../calculation-engine/types';

describe('Debug SEED Calculation', () => {
  let calculationEngine: CalculationEngine;
  let variableDataService: VariableDataService;
  let graphConverter: GraphConverter;

  beforeEach(() => {
    variableDataService = new VariableDataService();
     calculationEngine = new CalculationEngine();
    graphConverter = new GraphConverter();
  });

  it('should debug SEED node calculation with real application structure', async () => {
    // Mock console.log to capture all debug output
    const originalLog = console.log;
    const debugOutput: string[] = [];
    console.log = (...args: any[]) => {
      debugOutput.push(args.join(' '));
      originalLog(...args);
    };

    try {
      // Create variables that match the real application data
      const variables: Variable[] = [
        {
          id: 'historical-var-1',
          name: 'Historical Variable 1',
          type: 'ACTUAL',
          organizationId: 'test-org',
          timeSeries: [
            { date: new Date('2024-01-01T00:00:00.000Z'), value: 1000 },
            { date: new Date('2024-02-01T00:00:00.000Z'), value: 1100 },
            { date: new Date('2024-03-01T00:00:00.000Z'), value: 1200 },
            { date: new Date('2024-04-01T00:00:00.000Z'), value: 1300 },
            { date: new Date('2024-05-01T00:00:00.000Z'), value: 1400 },
            { date: new Date('2024-06-01T00:00:00.000Z'), value: 1500 },
            { date: new Date('2024-07-01T00:00:00.000Z'), value: 1600 },
            { date: new Date('2024-08-01T00:00:00.000Z'), value: 1700 },
            { date: new Date('2024-09-01T00:00:00.000Z'), value: 1800 },
            { date: new Date('2024-10-01T00:00:00.000Z'), value: 1900 },
            { date: new Date('2024-11-01T00:00:00.000Z'), value: 2000 },
            { date: new Date('2024-12-01T00:00:00.000Z'), value: 2100 },
            { date: new Date('2025-01-01T00:00:00.000Z'), value: 2200 },
          ],
        },
        {
          id: 'budget-var-1',
          name: 'Budget Variable 1',
          type: 'BUDGET',
          organizationId: 'test-org',
          timeSeries: [
            { date: new Date('2025-02-01T00:00:00.000Z'), value: 2300 },
            { date: new Date('2025-03-01T00:00:00.000Z'), value: 2400 },
            { date: new Date('2025-04-01T00:00:00.000Z'), value: 2500 },
            { date: new Date('2025-05-01T00:00:00.000Z'), value: 2600 },
            { date: new Date('2025-06-01T00:00:00.000Z'), value: 2700 },
            { date: new Date('2025-07-01T00:00:00.000Z'), value: 2800 },
            { date: new Date('2025-08-01T00:00:00.000Z'), value: 2900 },
            { date: new Date('2025-09-01T00:00:00.000Z'), value: 3000 },
            { date: new Date('2025-10-01T00:00:00.000Z'), value: 3100 },
            { date: new Date('2025-11-01T00:00:00.000Z'), value: 3200 },
            { date: new Date('2025-12-01T00:00:00.000Z'), value: 3300 },
          ],
        },
      ];

      // Create forecast nodes that match the real application structure
      // This creates a circular dependency: METRIC -> OPERATOR -> SEED -> METRIC
      const forecastNodes = [
        {
          id: 'metric-1',
          type: 'METRIC' as const,
          kind: 'METRIC',
          data: {
            useCalculated: false, // This means forecast values come from children, not variables
            historicalVariableId: 'historical-var-1',
            budgetVariableId: 'budget-var-1',
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'seed-1',
          type: 'SEED' as const,
          kind: 'SEED',
          data: {
            sourceMetricId: 'metric-1', // References the metric above
          },
          position: { x: 100, y: 100 },
        },
        {
          id: 'operator-1',
          type: 'OPERATOR',
          kind: 'OPERATOR',
          data: {
            op: '+',
            inputOrder: ['seed-1'],
          },
          position: { x: 200, y: 200 },
        },
      ];

      // Create forecast edges that create the circular dependency
      const forecastEdges = [
        {
          id: 'edge-1',
          source: 'operator-1',
          target: 'metric-1', // OPERATOR feeds into METRIC
          type: 'DATA',
        },
        {
          id: 'edge-2',
          source: 'seed-1',
          target: 'operator-1', // SEED feeds into OPERATOR
          type: 'DATA',
        },
      ];

      // Convert to calculation trees
      const trees = graphConverter.convertToTrees(forecastNodes, forecastEdges);
      console.log('Generated trees:', JSON.stringify(trees, null, 2));

      // Run unified calculation with all types
      const result = await calculationEngine.calculateWithPeriods(
        trees,
        '02-2025', // forecast start
        '04-2025', // forecast end
        '01-2024', // actual start
        '01-2025', // actual end
        variables,
        {
          calculationTypes: ['historical', 'forecast', 'budget'],
          includeIntermediateNodes: true,
        }
      );

      console.log('Calculation result:', JSON.stringify(result, null, 2));

      // Filter debug output for SEED-related logs
      const seedDebugOutput = debugOutput.filter(line => 
        line.includes('SEED') || 
        line.includes('seed-1') || 
        line.includes('metric-1') ||
        line.includes('===== SEED NODE EVALUATION') ||
        line.includes('operator-1')
      );

      console.log('\n=== SEED DEBUG OUTPUT ===');
      seedDebugOutput.forEach(line => console.log(line));
      console.log('=== END SEED DEBUG OUTPUT ===\n');

      // Verify the result
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.allNodes).toBeDefined();

      // Check if SEED node has values
      const seedNode = result.allNodes.find(node => node.nodeId === 'seed-1');
      if (seedNode) {
        console.log('SEED node values:', JSON.stringify(seedNode.values, null, 2));
        expect(seedNode.values.length).toBeGreaterThan(0);
      }

      // Check if METRIC node has forecast values
      const metricNode = result.metrics.find(node => node.nodeId === 'metric-1');
      if (metricNode) {
        console.log('METRIC node values:', JSON.stringify(metricNode.values, null, 2));
        expect(metricNode.values.length).toBeGreaterThan(0);
      }

    } finally {
      // Restore original console.log
      console.log = originalLog;
    }
  }, 30000); // 30 second timeout for debugging
});
