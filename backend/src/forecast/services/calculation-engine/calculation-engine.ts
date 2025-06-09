import type { 
  Variable,
  CalculationTree,
  CalculationTreeNode,
  ForecastCalculationResult,
  MetricCalculationResult,
  MonthlyForecastValue,
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes
} from './types';
import { VariableDataService } from './variable-data-service';

/**
 * Core calculation engine for forecast execution in backend
 */
interface ICalculationEngineService {
  /**
   * Main calculation entry point
   */
  calculateForecast(
    trees: readonly CalculationTree[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ForecastCalculationResult>;
}

interface CalculationContext {
  readonly variables: readonly Variable[];
  readonly forecastStartDate: Date;
  readonly forecastEndDate: Date;
  readonly calculationCache: Map<string, number | null>;
  readonly monthlyCache: Map<string, Map<number, MonthlyForecastValue>>;
}

/**
 * Implementation of calculation engine for backend
 */
export class CalculationEngine implements ICalculationEngineService {
  private readonly logger = console;

  constructor(
    private readonly variableDataService: VariableDataService
  ) {}

  async calculateForecast(
    trees: readonly CalculationTree[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ForecastCalculationResult> {
    try {
      this.logger.log('[CalculationEngine] Starting forecast calculation');
      this.logger.log(`[CalculationEngine] Period: ${forecastStartDate.toISOString()} to ${forecastEndDate.toISOString()}`);
      this.logger.log(`[CalculationEngine] Processing ${trees.length} calculation trees`);

      // Order trees by dependencies to handle cross-tree references
      const orderedTrees = this.orderTreesByDependencies(trees);
      this.logger.log(`[CalculationEngine] Tree processing order: [${orderedTrees.map(t => t.rootMetricNodeId).join(', ')}]`);

      const context: CalculationContext = {
        variables,
        forecastStartDate,
        forecastEndDate,
        calculationCache: new Map(),
        monthlyCache: new Map(),
      };

      const metrics: MetricCalculationResult[] = [];

      for (let i = 0; i < orderedTrees.length; i++) {
        const tree = orderedTrees[i];
        this.logger.log(`[CalculationEngine] Processing tree ${i + 1}/${orderedTrees.length} (metric: ${tree.rootMetricNodeId})`);
        
        const metricResult = await this.calculateMetricTree(tree, context, orderedTrees);
        metrics.push(metricResult);
      }

      return {
        forecastId: '', // Will be set by caller
        calculatedAt: new Date(),
        metrics,
      };
    } catch (error) {
      this.logger.error('[CalculationEngine] Forecast calculation failed:', error);
      throw new Error(`Forecast calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async calculateMetricTree(
    tree: CalculationTree,
    context: CalculationContext,
    allTrees: readonly CalculationTree[]
  ): Promise<MetricCalculationResult> {
    const monthlyValues: MonthlyForecastValue[] = [];
    const monthCount = this.getMonthsBetween(context.forecastStartDate, context.forecastEndDate);

    for (let monthOffset = 0; monthOffset < monthCount; monthOffset++) {
      const targetDate = this.addMonths(context.forecastStartDate, monthOffset);
      const normalizedDate = this.normalizeToFirstOfMonth(targetDate);

      const forecastValue = await this.evaluateNode(
        tree.tree, 
        normalizedDate, 
        'forecast', 
        { ...context, currentMonth: monthOffset },
        allTrees
      );
      
      const budgetValue = await this.evaluateNode(
        tree.tree, 
        normalizedDate, 
        'budget', 
        { ...context, currentMonth: monthOffset },
        allTrees
      );
      
      const historicalValue = await this.evaluateNode(
        tree.tree, 
        normalizedDate, 
        'historical', 
        { ...context, currentMonth: monthOffset },
        allTrees
      );

      const monthlyValue: MonthlyForecastValue = {
        date: normalizedDate,
        forecast: forecastValue,
        budget: budgetValue,
        historical: historicalValue,
      };

      monthlyValues.push(monthlyValue);
      
      if (!context.monthlyCache.has(tree.rootMetricNodeId)) {
        context.monthlyCache.set(tree.rootMetricNodeId, new Map());
      }
      context.monthlyCache.get(tree.rootMetricNodeId)!.set(monthOffset, monthlyValue);
      this.logger.log(`[CalculationEngine] - Cached month ${monthOffset} for metric ${tree.rootMetricNodeId}: forecast=${forecastValue}, budget=${budgetValue}, historical=${historicalValue}`);
    }

    return {
      metricNodeId: tree.rootMetricNodeId,
      values: monthlyValues,
    };
  }

  private async evaluateNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number },
    allTrees?: readonly CalculationTree[]
  ): Promise<number | null> {
    try {
      const cacheKey = `${node.nodeId}-${targetDate.getTime()}-${calculationType}`;
      
      if (context.calculationCache.has(cacheKey)) {
        return context.calculationCache.get(cacheKey)!;
      }

      let result: number | null = null;

      switch (node.nodeType) {
        case 'DATA':
          result = await this.evaluateDataNode(node, targetDate, calculationType, context, allTrees);
          break;
        case 'CONSTANT':
          result = await this.evaluateConstantNode(node, targetDate, calculationType, context, allTrees);
          break;
        case 'OPERATOR':
          result = await this.evaluateOperatorNode(node, targetDate, calculationType, context, allTrees);
          break;
        case 'METRIC':
          result = await this.evaluateMetricNode(node, targetDate, calculationType, context, allTrees);
          break;
        case 'SEED':
          result = await this.evaluateSeedNode(node, targetDate, calculationType, context, allTrees);
          break;
        default:
          throw new Error(`Unknown node type: ${(node as any).nodeType}`);
      }

      context.calculationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Node evaluation failed for ${node.nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async evaluateDataNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number },
    allTrees?: readonly CalculationTree[]
  ): Promise<number | null> {
    const dataAttributes = node.nodeData as DataNodeAttributes;
    
    if (!dataAttributes.variableId) {
      throw new Error(`DATA node ${node.nodeId} missing variableId`);
    }

    return this.variableDataService.getVariableValueWithOffset(
      dataAttributes.variableId,
      targetDate,
      dataAttributes.offsetMonths || 0,
      context.variables
    );
  }

  private async evaluateConstantNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number },
    allTrees?: readonly CalculationTree[]
  ): Promise<number | null> {
    const constantAttributes = node.nodeData as ConstantNodeAttributes;
    return constantAttributes.value ?? null;
  }

  private async evaluateOperatorNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number },
    allTrees?: readonly CalculationTree[]
  ): Promise<number | null> {
    const operatorAttributes = node.nodeData as OperatorNodeAttributes;
    
    if (!operatorAttributes.op) {
      throw new Error(`OPERATOR node ${node.nodeId} missing operator`);
    }

    // Debug logging for inputOrder issue
    this.logger.log(`[CalculationEngine] OPERATOR ${node.nodeId} evaluation:`);
    this.logger.log(`[CalculationEngine] - Actual children: [${node.children.map(c => c.nodeId).join(', ')}]`);
    this.logger.log(`[CalculationEngine] - InputOrder: [${operatorAttributes.inputOrder?.join(', ') || 'none'}]`);

    const orderedChildren = operatorAttributes.inputOrder 
      ? this.orderChildrenByInputOrder(node.children, operatorAttributes.inputOrder)
      : node.children;

    this.logger.log(`[CalculationEngine] - Ordered children after processing: [${orderedChildren.map(c => c.nodeId).join(', ')}]`);

    const childValues: number[] = [];
    
    for (const child of orderedChildren) {
      const childValue = await this.evaluateNode(child, targetDate, calculationType, context, allTrees);
      this.logger.log(`[CalculationEngine] - Child ${child.nodeId} (${child.nodeType}) value: ${childValue}`);
      if (childValue === null) {
        this.logger.log(`[CalculationEngine] - OPERATOR returning null due to null child value`);
        return null;
      }
      childValues.push(childValue);
    }

    if (childValues.length === 0) {
      this.logger.error(`[CalculationEngine] - OPERATOR node ${node.nodeId} has no valid children`);
      throw new Error(`OPERATOR node ${node.nodeId} has no valid children`);
    }

    let result = childValues[0];
    for (let i = 1; i < childValues.length; i++) {
      const rightValue = childValues[i];
      
      switch (operatorAttributes.op) {
        case '+':
          result += rightValue;
          break;
        case '-':
          result -= rightValue;
          break;
        case '*':
          result *= rightValue;
          break;
        case '/':
          if (rightValue === 0) {
            return null;
          }
          result /= rightValue;
          break;
        case '^':
          result = Math.pow(result, rightValue);
          break;
        default:
          throw new Error(`Unknown operator: ${operatorAttributes.op}`);
      }
    }

    return result;
  }

  private async evaluateMetricNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number },
    allTrees?: readonly CalculationTree[]
  ): Promise<number | null> {
    const metricAttributes = node.nodeData as MetricNodeAttributes;

    // Validate node has at most one child for calculated values
    if (node.children.length > 1) {
      throw new Error(`METRIC node ${node.nodeId} cannot have more than one child`);
    }

    switch (calculationType) {
      case 'forecast':
        // Forecast values are ALWAYS calculated if children exist
        if (node.children.length > 0) {
          return this.evaluateNode(node.children[0], targetDate, calculationType, context, allTrees);
        }
        // Fallback to budget variable if no children and budget variable is configured
        if (metricAttributes.budgetVariableId && metricAttributes.budgetVariableId.trim() !== '') {
          return this.variableDataService.getVariableValueForMonth(
            metricAttributes.budgetVariableId,
            targetDate,
            context.variables
          );
        }
        return null;

      case 'budget':
        // Budget values: check useCalculated flag
        if (metricAttributes.useCalculated && node.children.length > 0) {
          // Use calculated value from children
          return this.evaluateNode(node.children[0], targetDate, calculationType, context, allTrees);
        }
        // Use budget variable if configured
        if (metricAttributes.budgetVariableId && metricAttributes.budgetVariableId.trim() !== '') {
          return this.variableDataService.getVariableValueForMonth(
            metricAttributes.budgetVariableId,
            targetDate,
            context.variables
          );
        }
        return null;

      case 'historical':
        // Historical values: check useCalculated flag
        if (metricAttributes.useCalculated && node.children.length > 0) {
          // Use calculated value from children
          return this.evaluateNode(node.children[0], targetDate, calculationType, context, allTrees);
        }
        // Use historical variable if configured
        if (metricAttributes.historicalVariableId && metricAttributes.historicalVariableId.trim() !== '') {
          return this.variableDataService.getVariableValueForMonth(
            metricAttributes.historicalVariableId,
            targetDate,
            context.variables
          );
        }
        return null;

      default:
        throw new Error(`Unknown calculation type: ${calculationType}`);
    }
  }

  private async evaluateSeedNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number },
    allTrees?: readonly CalculationTree[]
  ): Promise<number | null> {
    const seedAttributes = node.nodeData as SeedNodeAttributes;
    
    if (!seedAttributes.sourceMetricId) {
      throw new Error(`SEED node ${node.nodeId} missing sourceMetricId`);
    }

    this.logger.log(`[CalculationEngine] SEED ${node.nodeId} evaluation for month ${context.currentMonth}:`);
    this.logger.log(`[CalculationEngine] - Source metric ID: ${seedAttributes.sourceMetricId}`);
    this.logger.log(`[CalculationEngine] - Calculation type: ${calculationType}`);

    if (context.currentMonth === 0) {
      this.logger.log(`[CalculationEngine] - First month (0), using historical data from connected metric`);
      
      // For the first month, get the historical value from the connected metric node for t-1
      const prevMonthDate = this.addMonths(context.forecastStartDate, -1);
      this.logger.log(`[CalculationEngine] - Looking for historical data at ${prevMonthDate.toISOString()}`);
      
      // Find the metric node that this SEED references and get its historical variable
      const referencedMetricTree = allTrees?.find(tree => tree.rootMetricNodeId === seedAttributes.sourceMetricId);
      if (referencedMetricTree) {
        const metricNodeData = referencedMetricTree.tree.nodeData as MetricNodeAttributes;
        if (metricNodeData.historicalVariableId && metricNodeData.historicalVariableId.trim() !== '') {
          this.logger.log(`[CalculationEngine] - Looking up historical variable: ${metricNodeData.historicalVariableId}`);
          
          const value = this.variableDataService.getVariableValueForMonth(metricNodeData.historicalVariableId, prevMonthDate, context.variables);
          
          if (value !== null) {
            this.logger.log(`[CalculationEngine] - SEED first month historical value from ${metricNodeData.historicalVariableId}: ${value}`);
            return value;
          } else {
            // Provide detailed warning message for missing historical data but don't throw error
            const historicalVariable = context.variables.find(v => v.id === metricNodeData.historicalVariableId);
            if (!historicalVariable) {
              this.logger.warn(`[CalculationEngine] - Historical variable ${metricNodeData.historicalVariableId} not found - using null value`);
              return null;
            }
            
            // Extract available dates from the variable's timeSeries
            const typedVariable = historicalVariable as Variable;
            let availableDates: string[] = [];
            
            if (typedVariable.timeSeries && Array.isArray(typedVariable.timeSeries)) {
              availableDates = typedVariable.timeSeries
                .map((ts: any) => {
                  // Handle both Date objects and string dates
                  const date = ts.date instanceof Date ? ts.date : new Date(ts.date);
                  return date.toISOString().substring(0, 10);
                })
                .filter((date: string) => date && date !== 'Invalid Date')
                .sort();
                
              this.logger.log(`[CalculationEngine] - Found ${availableDates.length} available dates in timeSeries`);
            } else {
              this.logger.log(`[CalculationEngine] - No timeSeries found or timeSeries is not an array`);
            }
            
            const expectedDate = prevMonthDate.toISOString().substring(0, 10);
            const datesDisplay = availableDates.length > 0 
              ? availableDates.slice(0, 10).join(', ') + (availableDates.length > 10 ? ` (and ${availableDates.length - 10} more)` : '')
              : 'No valid dates found in variable data';
            
            this.logger.warn(`[CalculationEngine] - Historical data for ${expectedDate} not found in variable '${typedVariable.name}' (${metricNodeData.historicalVariableId}). Available dates: ${datesDisplay} - using null value`);
            return null;
          }
        } else {
          this.logger.warn(`[CalculationEngine] - Metric node ${seedAttributes.sourceMetricId} has no historical variable configured - using null value`);
          return null;
        }
      } else {
        throw new Error(`Referenced metric node ${seedAttributes.sourceMetricId} not found in calculation trees.`);
      }
    }

    const previousMonthOffset = context.currentMonth - 1;
    this.logger.log(`[CalculationEngine] - Looking for previous month result at offset ${previousMonthOffset}`);
    
    const metricCache = context.monthlyCache.get(seedAttributes.sourceMetricId);
    
    if (!metricCache) {
      this.logger.log(`[CalculationEngine] - No metric cache found for ${seedAttributes.sourceMetricId}`);
      this.logger.log(`[CalculationEngine] - Available cache keys: [${Array.from(context.monthlyCache.keys()).join(', ')}]`);
      return null;
    }

    this.logger.log(`[CalculationEngine] - Metric cache exists, contains offsets: [${Array.from(metricCache.keys()).join(', ')}]`);
    
    const previousMonthResult = metricCache.get(previousMonthOffset);
    if (!previousMonthResult) {
      this.logger.log(`[CalculationEngine] - No previous month result found for offset ${previousMonthOffset}`);
      return null;
    }
    
    this.logger.log(`[CalculationEngine] - Previous month result found: forecast=${previousMonthResult.forecast}, budget=${previousMonthResult.budget}, historical=${previousMonthResult.historical}`);
    

    let result: number | null = null;
    switch (calculationType) {
      case 'forecast':
        result = previousMonthResult.forecast;
        break;
      case 'budget':
        result = previousMonthResult.budget;
        break;
      case 'historical':
        result = previousMonthResult.historical;
        break;
      default:
        throw new Error(`Unknown calculation type: ${calculationType}`);
    }

    this.logger.log(`[CalculationEngine] - SEED returning: ${result}`);
    return result;
  }

  private orderChildrenByInputOrder(
    children: readonly CalculationTreeNode[],
    inputOrder: readonly string[]
  ): CalculationTreeNode[] {
    const childMap = new Map<string, CalculationTreeNode>();
    children.forEach(child => childMap.set(child.nodeId, child));

    const orderedChildren: CalculationTreeNode[] = [];
    
    inputOrder.forEach(nodeId => {
      const child = childMap.get(nodeId);
      if (child) {
        orderedChildren.push(child);
        childMap.delete(nodeId);
      }
    });

    childMap.forEach(child => orderedChildren.push(child));
    return orderedChildren;
  }

  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    return ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private normalizeToFirstOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Orders calculation trees by their dependencies to ensure that referenced
   * metrics are calculated before metrics that depend on them via SEED nodes
   */
  private orderTreesByDependencies(trees: readonly CalculationTree[]): CalculationTree[] {
    this.logger.log('[CalculationEngine] Analyzing tree dependencies');
    
    // Build dependency map: treeId -> [dependsOnTreeIds]
    const dependencies = this.analyzeCrossTreeDependencies(trees);
    
    // Log dependencies for debugging
    dependencies.forEach((deps, treeId) => {
      if (deps.length > 0) {
        this.logger.log(`[CalculationEngine] Tree ${treeId} depends on: [${deps.join(', ')}]`);
      }
    });
    
    // Perform topological sort
    const ordered = this.topologicalSortTrees(trees, dependencies);
    
    this.logger.log('[CalculationEngine] Dependency analysis complete');
    return ordered;
  }

  /**
   * Analyzes cross-tree dependencies by finding SEED nodes that reference
   * other metric trees
   */
  private analyzeCrossTreeDependencies(trees: readonly CalculationTree[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    // Initialize all trees with empty dependencies
    trees.forEach(tree => {
      dependencies.set(tree.rootMetricNodeId, []);
    });
    
    // Find SEED nodes and their cross-tree references
    trees.forEach(tree => {
      const seedNodes = this.findSeedNodesInTree(tree.tree);
      const crossTreeDeps: string[] = [];
      
      seedNodes.forEach(seedNode => {
        const seedData = seedNode.nodeData as SeedNodeAttributes;
        if (seedData.sourceMetricId && seedData.sourceMetricId !== tree.rootMetricNodeId) {
          // This is a cross-tree dependency
          if (!crossTreeDeps.includes(seedData.sourceMetricId)) {
            crossTreeDeps.push(seedData.sourceMetricId);
          }
        }
      });
      
      dependencies.set(tree.rootMetricNodeId, crossTreeDeps);
    });
    
    return dependencies;
  }

  /**
   * Recursively finds all SEED nodes in a calculation tree
   */
  private findSeedNodesInTree(node: CalculationTreeNode): CalculationTreeNode[] {
    const seedNodes: CalculationTreeNode[] = [];
    
    if (node.nodeType === 'SEED') {
      seedNodes.push(node);
    }
    
    // Recursively search children
    node.children.forEach(child => {
      seedNodes.push(...this.findSeedNodesInTree(child));
    });
    
    return seedNodes;
  }

  /**
   * Performs topological sort on trees based on their dependencies
   * Throws error if circular dependencies are detected
   */
  private topologicalSortTrees(
    trees: readonly CalculationTree[], 
    dependencies: Map<string, string[]>
  ): CalculationTree[] {
    const sorted: CalculationTree[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>(); // For cycle detection
    
    const visit = (treeId: string): void => {
      if (visiting.has(treeId)) {
        throw new Error(`Circular dependency detected involving metric: ${treeId}`);
      }
      
      if (visited.has(treeId)) {
        return; // Already processed
      }
      
      visiting.add(treeId);
      
      // Visit all dependencies first
      const deps = dependencies.get(treeId) || [];
      deps.forEach(depId => {
        visit(depId);
      });
      
      visiting.delete(treeId);
      visited.add(treeId);
      
      // Add this tree to sorted list
      const tree = trees.find(t => t.rootMetricNodeId === treeId);
      if (tree) {
        sorted.push(tree);
      }
    };
    
    // Visit all trees
    trees.forEach(tree => {
      if (!visited.has(tree.rootMetricNodeId)) {
        visit(tree.rootMetricNodeId);
      }
    });
    
    return sorted;
  }
} 