import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { Request } from 'express';
import { DataIntakeService } from '../../data-intake/data-intake.service';
import { ForecastService } from './forecast.service';
import { ForecastNodeService } from './forecast-node.service';
import { ForecastEdgeService } from './forecast-edge.service';
import { ForecastCalculationResultDto } from '../dto/calculation.dto';
import { GraphConverter } from './calculation-engine/graph-converter';
import { CalculationEngine } from './calculation-engine/calculation-engine';
import { VariableDataService } from './calculation-engine/variable-data-service';
import type { 
  ForecastCalculationResult, 
  ForecastNodeClient, 
  ForecastEdgeClient,
  Variable
} from './calculation-engine/types';

/**
 * Service for calculating forecast results
 * Orchestrates the complete calculation workflow from graph to results
 */
@Injectable()
export class ForecastCalculationService {
  private readonly logger = new Logger(ForecastCalculationService.name);

  constructor(
    private readonly supabaseService: SupabaseOptimizedService,
    private readonly dataIntakeService: DataIntakeService,
    private readonly forecastService: ForecastService,
    private readonly forecastNodeService: ForecastNodeService,
    private readonly forecastEdgeService: ForecastEdgeService
  ) {}

  /**
   * Calculate forecast and store results
   * @param forecastId UUID of the forecast to calculate
   * @param userId UUID of the requesting user
   * @returns Promise resolving to calculation results
   */
  async calculateForecast(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    try {
      this.logger.log(`[ForecastCalculation] Starting calculation for forecast ${forecastId} by user ${userId}`);
      
      // 1. Fetch and validate forecast
      const forecast = await this.forecastService.findOne(forecastId, userId, request);
      if (!forecast) {
        throw new NotFoundException(`Forecast ${forecastId} not found`);
      }

      this.logger.log(`[ForecastCalculation] Forecast found: ${forecast.name}`);

      // 2. Fetch forecast graph (nodes and edges)
      const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
      const edges = await this.forecastEdgeService.findByForecast(forecastId, request);

      this.logger.log(`[ForecastCalculation] Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);

      // 3. Fetch organization variables for calculation
      const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
      const variables = variablesResponse.variables || [];

      this.logger.log(`[ForecastCalculation] Variables loaded: ${variables.length} variables`);
      
      // Log variable details for debugging
      variables.forEach(variable => {
        const dataCount = variable.values ? variable.values.length : 0;
        this.logger.log(`[ForecastCalculation] Variable: ${variable.id} (${variable.name}) - ${dataCount} data points`);
        if (variable.values && variable.values.length > 0) {
          const firstDate = variable.values[0].date;
          const lastDate = variable.values[variable.values.length - 1].date;
          this.logger.log(`[ForecastCalculation] Variable ${variable.name} date range: ${firstDate} to ${lastDate}`);
        }
      });

      // 4. Transform data for calculation engine
      const transformedNodes = this.transformNodesToCalculationFormat(nodes);
      const transformedEdges = this.transformEdgesToCalculationFormat(edges);
      const transformedVariables = this.transformVariablesToCalculationFormat(variables);

      this.logger.log(`[ForecastCalculation] Data transformed for calculation engine`);

      // 5. Execute real calculation using calculation engine
      const calculationResult = await this.executeRealCalculation(
        forecastId,
        forecast,
        transformedNodes,
        transformedEdges,
        transformedVariables
      );

      // 6. Store calculation results in database
      const storedResult = await this.storeCalculationResults(
        forecastId,
        forecast.organizationId,
        calculationResult,
        request
      );

      this.logger.log(`[ForecastCalculation] Calculation completed and stored for forecast ${forecastId}`);
      return storedResult;
      
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Calculation failed for forecast ${forecastId}:`, error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        `Forecast calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute real calculation using frontend calculation engine
   * @private
   */
  private async executeRealCalculation(
    forecastId: string,
    forecast: any,
    nodes: ForecastNodeClient[],
    edges: ForecastEdgeClient[],
    variables: Variable[]
  ): Promise<ForecastCalculationResult> {
    try {
      this.logger.log(`[ForecastCalculation] Starting real calculation engine execution`);
      
      // Validate data integrity first
      this.validateDataIntegrity(nodes, edges);
      
      // Initialize calculation services
      const graphConverter = new GraphConverter();
      const variableDataService = new VariableDataService();
      const calculationEngine = new CalculationEngine(variableDataService);
      
      // Validate graph and convert to calculation trees
      this.logger.log(`[ForecastCalculation] Validating graph structure`);
      const validation = graphConverter.validateGraph(nodes, edges);
      
      if (!validation.isValid) {
        this.logger.error(`[ForecastCalculation] Graph validation failed:`, validation.errors);
        throw new BadRequestException(`Invalid forecast graph: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        this.logger.warn(`[ForecastCalculation] Graph validation warnings:`, validation.warnings);
      }
      
      // Convert graph to calculation trees
      this.logger.log(`[ForecastCalculation] Converting graph to calculation trees`);
      const trees = graphConverter.convertToTrees(nodes, edges);
      this.logger.log(`[ForecastCalculation] Generated ${trees.length} calculation trees`);
      
      // Execute calculation
      this.logger.log(`[ForecastCalculation] Executing calculation for period ${forecast.forecastStartDate} to ${forecast.forecastEndDate}`);
      const result = await calculationEngine.calculateForecast(
        trees,
        new Date(forecast.forecastStartDate),
        new Date(forecast.forecastEndDate),
        variables
      );
      
      // Return result with forecast ID
      return {
        ...result,
        forecastId
      };
      
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Real calculation execution failed:`, error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      if (error instanceof Error) {
        // Handle specific calculation errors that should be shown to users
        if (error.message.includes('Graph validation failed')) {
          throw new BadRequestException(`Invalid forecast graph: ${error.message}`);
        }
        if (error.message.includes('Variable not found')) {
          throw new BadRequestException(`Missing variable data: ${error.message}`);
        }
        if (error.message.includes('Calculation failed')) {
          throw new BadRequestException(`Calculation error: ${error.message}`);
        }
        if (error.message.includes('Historical data for')) {
          throw new BadRequestException(`Missing historical data: ${error.message}`);
        }
        if (error.message.includes('Historical variable')) {
          throw new BadRequestException(`Variable configuration error: ${error.message}`);
        }
        if (error.message.includes('Node evaluation failed')) {
          throw new BadRequestException(`Node calculation error: ${error.message}`);
        }
        if (error.message.includes('has no historical variable configured')) {
          throw new BadRequestException(`Configuration error: ${error.message}`);
        }
        if (error.message.includes('not found in calculation trees')) {
          throw new BadRequestException(`Graph structure error: ${error.message}`);
        }
      }
      
      throw new InternalServerErrorException(
        `Calculation engine execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate data integrity to catch common issues before calculation
   * @private
   */
  private validateDataIntegrity(nodes: ForecastNodeClient[], edges: ForecastEdgeClient[]): void {
    this.logger.log(`[ForecastCalculation] Validating data integrity`);
    
    // Check for orphaned SEED node references
    const seedNodes = nodes.filter(n => n.type === 'SEED');
    const metricNodeIds = new Set(nodes.filter(n => n.type === 'METRIC').map(n => n.id));
    
    const orphanedSeedRefs = seedNodes.filter(seedNode => {
      const seedData = seedNode.data as any;
      return seedData.sourceMetricId && !metricNodeIds.has(seedData.sourceMetricId);
    });
    
    if (orphanedSeedRefs.length > 0) {
      const orphanedInfo = orphanedSeedRefs.map(node => {
        const seedData = node.data as any;
        return `SEED node ${node.id} → metric ${seedData.sourceMetricId}`;
      }).join(', ');
      
      this.logger.warn(`[ForecastCalculation] Found orphaned SEED references: ${orphanedInfo}`);
      throw new BadRequestException(
        `Data integrity issue: Found SEED nodes referencing non-existent metrics. This usually means the forecast data is out of sync. Please save your current changes first, then try calculating again. Orphaned references: ${orphanedInfo}`
      );
    }
    
    // Check for orphaned edge references  
    const nodeIds = new Set(nodes.map(n => n.id));
    const orphanedEdges = edges.filter(edge => 
      !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
    );
    
    if (orphanedEdges.length > 0) {
      const orphanedInfo = orphanedEdges.map(edge => `edge ${edge.id}`).join(', ');
      this.logger.warn(`[ForecastCalculation] Found orphaned edges: ${orphanedInfo}`);
      throw new BadRequestException(
        `Data integrity issue: Found edges referencing non-existent nodes. Please save your current changes first. Orphaned edges: ${orphanedInfo}`
      );
    }
    
    this.logger.log(`[ForecastCalculation] Data integrity validation passed`);
  }

  /**
   * Transform backend nodes to frontend calculation format
   * @private
   */
  private transformNodesToCalculationFormat(nodes: any[]): ForecastNodeClient[] {
    return nodes.map(node => ({
      id: node.id,
      type: node.kind, // Backend uses 'kind', frontend uses 'type'
      data: node.attributes,
      position: node.position
    }));
  }

  /**
   * Transform backend edges to frontend calculation format
   * @private
   */
  private transformEdgesToCalculationFormat(edges: any[]): ForecastEdgeClient[] {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId
    }));
  }

  /**
   * Transform backend variables to frontend calculation format
   * @private
   */
  private transformVariablesToCalculationFormat(variables: any[]): Variable[] {
    return variables.map((variable: any) => ({
      id: variable.id,
      name: variable.name,
      type: variable.type,
      organizationId: variable.organization_id,
      timeSeries: (variable.values || []).map((value: any) => ({
        date: new Date(value.date),
        value: value.value
      }))
    }));
  }

  /**
   * Get latest calculation results from database
   * @param forecastId UUID of the forecast
   * @param userId UUID of the requesting user
   * @returns Promise resolving to calculation results or null if not found
   */
  async getLatestCalculationResults(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<ForecastCalculationResultDto | null> {
    try {
      this.logger.log(`[ForecastCalculation] Fetching latest results for forecast ${forecastId}`);
      
      // Verify user has access to the forecast
      await this.forecastService.findOne(forecastId, userId, request);

      const client = this.supabaseService.getClientForRequest(request);
      
      const { data, error } = await client
        .from('forecast_calculation_results')
        .select('*')
        .eq('forecast_id', forecastId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        this.logger.error(`[ForecastCalculation] Database error fetching results:`, error);
        throw new InternalServerErrorException(`Database error: ${error.message}`);
      }

      if (!data) {
        this.logger.log(`[ForecastCalculation] No calculation results found for forecast ${forecastId}`);
        return null;
      }

      return this.mapDatabaseResultToDto(data);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      
      this.logger.error(`[ForecastCalculation] Failed to fetch calculation results:`, error);
      throw new InternalServerErrorException(
        `Failed to fetch calculation results: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get calculation history for a forecast
   * @param forecastId UUID of the forecast
   * @param userId UUID of the requesting user
   * @returns Promise resolving to array of historical calculation results
   */
  async getCalculationHistory(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<ForecastCalculationResultDto[]> {
    try {
      this.logger.log(`[ForecastCalculation] Fetching calculation history for forecast ${forecastId}`);
      
      // Verify user has access to the forecast
      await this.forecastService.findOne(forecastId, userId, request);

      const client = this.supabaseService.getClientForRequest(request);
      
      const { data, error } = await client
        .from('forecast_calculation_results')
        .select('*')
        .eq('forecast_id', forecastId)
        .order('calculated_at', { ascending: false });

      if (error) {
        this.logger.error(`[ForecastCalculation] Database error fetching history:`, error);
        throw new InternalServerErrorException(`Database error: ${error.message}`);
      }

      const results = data.map((item: any) => this.mapDatabaseResultToDto(item));
      this.logger.log(`[ForecastCalculation] Retrieved ${results.length} historical results`);
      
      return results;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      
      this.logger.error(`[ForecastCalculation] Failed to fetch calculation history:`, error);
      throw new InternalServerErrorException(
        `Failed to fetch calculation history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store calculation results in the database
   * @private
   */
  private async storeCalculationResults(
    forecastId: string,
    organizationId: string,
    results: any,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    try {
      const client = this.supabaseService.getClientForRequest(request);
      
      const { data, error } = await client
        .from('forecast_calculation_results')
        .insert({
          forecast_id: forecastId,
          organization_id: organizationId,
          calculated_at: new Date().toISOString(),
          results: results.metrics // Store the metrics array as JSONB
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`[ForecastCalculation] Failed to store results:`, error);
        throw new InternalServerErrorException(`Failed to store calculation results: ${error.message}`);
      }

      return this.mapDatabaseResultToDto(data);
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Error storing calculation results:`, error);
      throw error;
    }
  }

  /**
   * Map database entity to DTO
   * @private
   */
  private mapDatabaseResultToDto(data: any): ForecastCalculationResultDto {
    return {
      id: data.id,
      forecastId: data.forecast_id,
      calculatedAt: data.calculated_at,
      metrics: data.results || []
    };
  }
} 