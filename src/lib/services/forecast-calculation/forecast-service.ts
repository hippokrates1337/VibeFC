import type { Variable } from '@/lib/store/variables';
import type { 
  ForecastNodeClient, 
  ForecastEdgeClient 
} from '@/lib/store/forecast-graph-store';
import type { 
  ForecastCalculationResult,
  GraphValidationResult
} from '@/types/forecast';
import { GraphConverter } from './graph-converter';
import { CalculationEngine } from './calculation-engine';
import { VariableDataService } from './variable-data-service';

/**
 * Main forecast calculation service - orchestrates the entire calculation process
 */
interface IForecastService {
  /**
   * Validates forecast graph
   * @param nodes Array of forecast nodes
   * @param edges Array of forecast edges
   * @returns Validation result with errors and warnings
   */
  validateGraph(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): Promise<GraphValidationResult>;

  /**
   * Calculates forecast for the given graph
   * @param forecastId ID of the forecast being calculated
   * @param nodes Array of forecast nodes
   * @param edges Array of forecast edges
   * @param forecastStartDate Start date for forecast period
   * @param forecastEndDate End date for forecast period
   * @param variables Available variables for calculation
   * @returns Promise resolving to calculation results
   * @throws {Error} When calculation fails or graph is invalid
   */
  calculateForecast(
    forecastId: string,
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ForecastCalculationResult>;
}

/**
 * Implementation of forecast service
 */
export class ForecastService implements IForecastService {
  private readonly logger = console; // Use console for debugging output
  private readonly graphConverter: GraphConverter;
  private readonly calculationEngine: CalculationEngine;
  private readonly variableDataService: VariableDataService;

  constructor() {
    this.variableDataService = new VariableDataService();
    this.graphConverter = new GraphConverter();
    this.calculationEngine = new CalculationEngine(this.variableDataService);
  }

  /**
   * Validates forecast graph
   */
  async validateGraph(
    nodes: readonly ForecastNodeClient[], 
    edges: readonly ForecastEdgeClient[]
  ): Promise<GraphValidationResult> {
    try {
      this.logger.log('[ForecastService] Starting graph validation');
      this.logger.log(`[ForecastService] Input: ${nodes.length} nodes, ${edges.length} edges`);
      
      const validation = this.graphConverter.validateGraph(nodes, edges);
      
      this.logger.log(`[ForecastService] Validation complete - ${validation.isValid ? 'VALID' : 'INVALID'}`);
      if (validation.errors.length > 0) {
        this.logger.log('[ForecastService] Validation errors:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        this.logger.log('[ForecastService] Validation warnings:', validation.warnings);
      }
      
      return validation;
    } catch (error) {
      this.logger.error('[ForecastService] Graph validation failed:', error);
      throw new Error(`Graph validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates forecast for the given graph
   */
  async calculateForecast(
    forecastId: string,
    nodes: readonly ForecastNodeClient[],
    edges: readonly ForecastEdgeClient[],
    forecastStartDate: Date,
    forecastEndDate: Date,
    variables: readonly Variable[]
  ): Promise<ForecastCalculationResult> {
    try {
      this.logger.log('[ForecastService] Starting forecast calculation');
      this.logger.log(`[ForecastService] Forecast ID: ${forecastId}`);
      this.logger.log(`[ForecastService] Period: ${forecastStartDate.toISOString()} to ${forecastEndDate.toISOString()}`);
      this.logger.log(`[ForecastService] Input: ${nodes.length} nodes, ${edges.length} edges`);
      this.logger.log(`[ForecastService] Available variables: ${variables.length}`);

      // Step 1: Validate the graph
      this.logger.log('[ForecastService] Step 1: Validating graph');
      const validation = await this.validateGraph(nodes, edges);
      
      if (!validation.isValid) {
        const errorMessage = `Invalid graph: ${validation.errors.join(', ')}`;
        this.logger.error('[ForecastService] Graph validation failed:', errorMessage);
        throw new Error(errorMessage);
      }

      if (validation.warnings.length > 0) {
        this.logger.warn('[ForecastService] Graph validation warnings:', validation.warnings);
      }

      // Step 2: Convert graph to calculation trees
      this.logger.log('[ForecastService] Step 2: Converting graph to calculation trees');
      const trees = this.graphConverter.convertToTrees(nodes, edges);
      this.logger.log(`[ForecastService] Generated ${trees.length} calculation trees`);

      // Step 3: Execute calculations
      this.logger.log('[ForecastService] Step 3: Executing calculations');
      const result = await this.calculationEngine.calculateForecast(
        trees,
        forecastStartDate,
        forecastEndDate,
        variables
      );

      // Step 4: Set the forecast ID and return
      const finalResult = {
        ...result,
        forecastId,
      };

      this.logger.log('[ForecastService] Forecast calculation completed successfully');
      this.logger.log(`[ForecastService] Generated results for ${finalResult.metrics.length} metrics`);
      
      return finalResult;
    } catch (error) {
      this.logger.error('[ForecastService] Forecast calculation failed:', error);
      throw new Error(`Forecast calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance for easy use
export const forecastService = new ForecastService(); 