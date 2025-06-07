import type { Variable } from '@/lib/store/variables';
import type { 
  CalculationTree,
  CalculationTreeNode,
  ForecastCalculationResult,
  MetricCalculationResult,
  MonthlyForecastValue
} from '@/types/forecast';
import type {
  DataNodeAttributes,
  ConstantNodeAttributes,
  OperatorNodeAttributes,
  MetricNodeAttributes,
  SeedNodeAttributes
} from '@/lib/store/forecast-graph-store';
import { VariableDataService } from './variable-data-service';

/**
 * Core calculation engine for forecast execution
 */
interface ICalculationEngineService {
  /**
   * Main calculation entry point
   * @param trees Array of calculation trees to execute
   * @param forecastStartDate Start date for forecast period
   * @param forecastEndDate End date for forecast period
   * @param variables Available variables for calculation
   * @returns Promise resolving to calculation results
   * @throws {Error} When calculation fails
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
  readonly monthlyCache: Map<string, Map<number, MonthlyForecastValue>>; // metricId -> monthOffset -> result
}

/**
 * Implementation of calculation engine
 */
export class CalculationEngine implements ICalculationEngineService {
  private readonly logger = console; // Use console for debugging output

  constructor(
    private readonly variableDataService: VariableDataService
  ) {}

  /**
   * Main calculation entry point
   */
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
      this.logger.log(`[CalculationEngine] Available variables: ${variables.length}`);

      const context: CalculationContext = {
        variables,
        forecastStartDate,
        forecastEndDate,
        calculationCache: new Map(),
        monthlyCache: new Map(), // Cache results by month for seed nodes
      };

      const metrics: MetricCalculationResult[] = [];

      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        this.logger.log(`[CalculationEngine] Processing tree ${i + 1}/${trees.length} (metric: ${tree.rootMetricNodeId})`);
        
        const metricResult = await this.calculateMetricTree(tree, context);
        metrics.push(metricResult);
        
        this.logger.log(`[CalculationEngine] Completed tree ${i + 1}/${trees.length}`);
      }

      const result = {
        forecastId: '', // Will be set by caller
        calculatedAt: new Date(),
        metrics,
      };

      this.logger.log('[CalculationEngine] Forecast calculation completed successfully');
      this.logger.log(`[CalculationEngine] Generated ${metrics.length} metric results`);
      return result;
    } catch (error) {
      this.logger.error('[CalculationEngine] Forecast calculation failed:', error);
      throw new Error(`Forecast calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async calculateMetricTree(
    tree: CalculationTree,
    context: CalculationContext
  ): Promise<MetricCalculationResult> {
    this.logger.log(`[CalculationEngine] Calculating metric tree: ${tree.rootMetricNodeId}`);
    
    const monthlyValues: MonthlyForecastValue[] = [];
    const monthCount = this.getMonthsBetween(context.forecastStartDate, context.forecastEndDate);
    
    this.logger.log(`[CalculationEngine] Calculating ${monthCount} months of values`);

    for (let monthOffset = 0; monthOffset < monthCount; monthOffset++) {
      const targetDate = this.addMonths(context.forecastStartDate, monthOffset);
      const normalizedDate = this.normalizeToFirstOfMonth(targetDate);
      
      this.logger.log(`[CalculationEngine] Calculating month ${monthOffset + 1}/${monthCount}: ${normalizedDate.toISOString()}`);

      // Calculate all three value types for this month
      const forecastValue = await this.evaluateNode(
        tree.tree, 
        normalizedDate, 
        'forecast', 
        { ...context, currentMonth: monthOffset }
      );
      
      const budgetValue = await this.evaluateNode(
        tree.tree, 
        normalizedDate, 
        'budget', 
        { ...context, currentMonth: monthOffset }
      );
      
      const historicalValue = await this.evaluateNode(
        tree.tree, 
        normalizedDate, 
        'historical', 
        { ...context, currentMonth: monthOffset }
      );

      const monthlyValue: MonthlyForecastValue = {
        date: normalizedDate,
        forecast: forecastValue,
        budget: budgetValue,
        historical: historicalValue,
      };

      monthlyValues.push(monthlyValue);
      
      // Store monthly result for seed nodes to reference previous months
      if (!context.monthlyCache.has(tree.rootMetricNodeId)) {
        context.monthlyCache.set(tree.rootMetricNodeId, new Map());
      }
      context.monthlyCache.get(tree.rootMetricNodeId)!.set(monthOffset, monthlyValue);

      this.logger.log(`[CalculationEngine] Month ${monthOffset + 1} results - F: ${forecastValue}, B: ${budgetValue}, H: ${historicalValue}`);
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
    context: CalculationContext & { currentMonth: number }
  ): Promise<number | null> {
    try {
      const cacheKey = `${node.nodeId}-${targetDate.getTime()}-${calculationType}`;
      
      if (context.calculationCache.has(cacheKey)) {
        const cachedValue = context.calculationCache.get(cacheKey)!;
        this.logger.log(`[CalculationEngine] Cache hit for ${node.nodeType} node ${node.nodeId}: ${cachedValue}`);
        return cachedValue;
      }

      this.logger.log(`[CalculationEngine] Evaluating ${node.nodeType} node ${node.nodeId} for ${calculationType}`);

      let result: number | null = null;

      switch (node.nodeType) {
        case 'DATA':
          result = await this.evaluateDataNode(node, targetDate, calculationType, context);
          break;
        case 'CONSTANT':
          result = await this.evaluateConstantNode(node, targetDate, calculationType, context);
          break;
        case 'OPERATOR':
          result = await this.evaluateOperatorNode(node, targetDate, calculationType, context);
          break;
        case 'METRIC':
          result = await this.evaluateMetricNode(node, targetDate, calculationType, context);
          break;
        case 'SEED':
          result = await this.evaluateSeedNode(node, targetDate, calculationType, context);
          break;
        default:
          throw new Error(`Unknown node type: ${node.nodeType}`);
      }

      context.calculationCache.set(cacheKey, result);
      this.logger.log(`[CalculationEngine] ${node.nodeType} node ${node.nodeId} evaluated to: ${result}`);
      
      return result;
    } catch (error) {
      this.logger.error(`[CalculationEngine] Node evaluation failed for ${node.nodeId}:`, error);
      throw new Error(`Node evaluation failed for ${node.nodeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async evaluateDataNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number }
  ): Promise<number | null> {
    const dataNodeData = node.nodeData as DataNodeAttributes;
    const { variableId, offsetMonths = 0 } = dataNodeData;
    
    this.logger.log(`[CalculationEngine] DATA node: variable ${variableId}, offset ${offsetMonths} months`);
    
    return this.variableDataService.getVariableValueWithOffset(
      variableId,
      targetDate,
      offsetMonths,
      context.variables
    );
  }

  private async evaluateConstantNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number }
  ): Promise<number | null> {
    const constantData = node.nodeData as ConstantNodeAttributes;
    this.logger.log(`[CalculationEngine] CONSTANT node: value ${constantData.value}`);
    return constantData.value;
  }

  private async evaluateOperatorNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number }
  ): Promise<number | null> {
    const operatorData = node.nodeData as OperatorNodeAttributes;
    const { op, inputOrder } = operatorData;
    
    this.logger.log(`[CalculationEngine] OPERATOR node: operation ${op}, ${node.children.length} children`);

    // Evaluate all children
    const childValues: number[] = [];
    const orderedChildren = inputOrder ? 
      this.orderChildrenByInputOrder(node.children, inputOrder) : 
      node.children;

    for (let i = 0; i < orderedChildren.length; i++) {
      const child = orderedChildren[i];
      const childValue = await this.evaluateNode(child, targetDate, calculationType, context);
      
      if (childValue === null) {
        this.logger.warn(`[CalculationEngine] Child ${i + 1} of OPERATOR node returned null, skipping operation`);
        return null;
      }
      
      childValues.push(childValue);
    }

    if (childValues.length === 0) {
      this.logger.warn(`[CalculationEngine] OPERATOR node has no valid children`);
      return null;
    }

    // Perform operation
    let result: number = childValues[0];
    for (let i = 1; i < childValues.length; i++) {
      switch (op) {
        case '+':
          result += childValues[i];
          break;
        case '-':
          result -= childValues[i];
          break;
        case '*':
          result *= childValues[i];
          break;
        case '/':
          if (childValues[i] === 0) {
            this.logger.warn(`[CalculationEngine] Division by zero in OPERATOR node`);
            return null;
          }
          result /= childValues[i];
          break;
        case '^':
          result = Math.pow(result, childValues[i]);
          break;
        default:
          throw new Error(`Unknown operator: ${op}`);
      }
    }

    this.logger.log(`[CalculationEngine] OPERATOR result: ${childValues.join(` ${op} `)} = ${result}`);
    return result;
  }

  private async evaluateMetricNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number }
  ): Promise<number | null> {
    const metricData = node.nodeData as MetricNodeAttributes;
    const { budgetVariableId, historicalVariableId, useCalculated } = metricData;
    
    this.logger.log(`[CalculationEngine] METRIC node: type ${calculationType}, useCalculated=${useCalculated}`);

    // For budget/historical, check if we should use calculated values or variable data
    if ((calculationType === 'budget' || calculationType === 'historical') && !useCalculated) {
      const variableId = calculationType === 'budget' ? budgetVariableId : historicalVariableId;
      this.logger.log(`[CalculationEngine] Using variable data for ${calculationType}: ${variableId}`);
      
      return this.variableDataService.getVariableValueForMonth(
        variableId,
        targetDate,
        context.variables
      );
    }

    // For forecast, or when useCalculated is true, evaluate children recursively
    this.logger.log(`[CalculationEngine] Using calculated values for ${calculationType}`);
    
    if (node.children.length === 0) {
      this.logger.warn(`[CalculationEngine] METRIC node has no children for calculation`);
      return null;
    }

    // For now, if multiple children, sum them (this could be made configurable)
    let result = 0;
    for (const child of node.children) {
      const childValue = await this.evaluateNode(child, targetDate, calculationType, context);
      if (childValue !== null) {
        result += childValue;
      }
    }

    return result;
  }

  private async evaluateSeedNode(
    node: CalculationTreeNode,
    targetDate: Date,
    calculationType: 'forecast' | 'budget' | 'historical',
    context: CalculationContext & { currentMonth: number }
  ): Promise<number | null> {
    const seedData = node.nodeData as SeedNodeAttributes;
    const { sourceMetricId } = seedData;
    
    this.logger.log(`[CalculationEngine] SEED node: sourceMetricId ${sourceMetricId}, currentMonth ${context.currentMonth}`);

    // For the first month, we can't look at previous month, so use fallback
    if (context.currentMonth === 0) {
      this.logger.log(`[CalculationEngine] First month - looking up historicalVariableId of connected metric`);
      
      // Find the connected metric node to get its historicalVariableId
      const metricCache = context.monthlyCache.get(sourceMetricId);
      if (!metricCache) {
        // If no cache exists, we need to get the historicalVariableId from the metric node configuration
        // This requires access to the nodes - we'll need to pass this through context
        this.logger.warn(`[CalculationEngine] No metric cache found for ${sourceMetricId}, returning null`);
        return null;
      }
      
      // For now, return null for first month - this will be improved in implementation
      return null;
    }

    // Look up the previous month's result for the source metric
    const metricCache = context.monthlyCache.get(sourceMetricId);
    if (!metricCache) {
      this.logger.warn(`[CalculationEngine] No cached results found for source metric ${sourceMetricId}`);
      return null;
    }

    const previousMonthResult = metricCache.get(context.currentMonth - 1);
    if (!previousMonthResult) {
      this.logger.warn(`[CalculationEngine] No previous month result found for source metric ${sourceMetricId}`);
      return null;
    }

    // Return the appropriate value type from previous month
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
    }

    this.logger.log(`[CalculationEngine] SEED node using previous month ${calculationType}: ${result}`);
    return result;
  }

  private orderChildrenByInputOrder(
    children: readonly CalculationTreeNode[],
    inputOrder: readonly string[]
  ): CalculationTreeNode[] {
    const orderedChildren: CalculationTreeNode[] = [];
    
    for (const nodeId of inputOrder) {
      const child = children.find(c => c.nodeId === nodeId);
      if (child) {
        orderedChildren.push(child);
      }
    }
    
    // Add any children not in the input order at the end
    for (const child of children) {
      if (!inputOrder.includes(child.nodeId)) {
        orderedChildren.push(child);
      }
    }
    
    return orderedChildren;
  }

  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private normalizeToFirstOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
} 