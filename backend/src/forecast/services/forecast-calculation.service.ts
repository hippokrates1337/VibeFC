import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException, Inject } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { Request } from 'express';
import { DataIntakeService } from '../../data-intake/data-intake.service';
import { ForecastService } from './forecast.service';
import { ForecastNodeService } from './forecast-node.service';
import { ForecastEdgeService } from './forecast-edge.service';
import { ForecastCalculationResultDto, CalculationHealthDto, UnifiedCalculationRequestDto, UnifiedCalculationResultDto, CalculationTypeDto, UnifiedNodeResultDto, UnifiedMonthlyValueDto, PeriodInfoDto } from '../dto/calculation.dto';
import { ForecastDto } from '../dto/forecast.dto';
import { GraphConverter } from './calculation-engine/graph-converter';
import { VariableDataService } from './calculation-engine/variable-data-service';
import { CalculationEngine } from './calculation-engine/calculation-engine';
import { CalculationEngineCore } from './calculation-engine/calculation-engine-core';
import { CalculationAdapter } from './calculation-engine/adapters/calculation-adapter';
import type { 
  ExtendedForecastCalculationResult,
  Variable,
  ForecastNodeClient,
  ForecastEdgeClient,
  CalculationTreeNode,
  CalculationTree,
  UnifiedCalculationRequest,
  CalculationType,
  UnifiedCalculationResult
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
    private readonly forecastEdgeService: ForecastEdgeService,
    private readonly legacyEngine: CalculationEngine,
    private readonly newEngine: CalculationEngineCore,
    private readonly adapter: CalculationAdapter,
    @Inject('USE_NEW_CALCULATION_ENGINE') private readonly useNewEngine: boolean
  ) {}

  /**
   * Calculate forecast and store results
   * @deprecated Use calculateUnified instead for better performance and consistency
   * @param forecastId UUID of the forecast to calculate
   * @param userId UUID of the requesting user
   * @returns Promise resolving to calculation results
   */
  async calculateForecast(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    this.logger.warn(`[ForecastCalculation] DEPRECATED: calculateForecast called for forecast ${forecastId}. Routing to comprehensive calculation for consistency.`);
    
    // Route to comprehensive calculation with forecast-only calculation type
    const calculationRequest: UnifiedCalculationRequestDto = {
      calculationTypes: [CalculationTypeDto.FORECAST],
      includeIntermediateNodes: true // Include all nodes for backward compatibility
    };

    const result = await this.calculateForecastWithPeriods(forecastId, userId, request, calculationRequest);

    // Convert result back to legacy format for backward compatibility
    return this.convertToLegacyDto(result);
  }

  /**
   * Calculate historical values for a forecast within a specified actual period
   * Now also calculates forecast and budget values for complete data
   * @param forecastId - The forecast to calculate
   * @param actualStartDate - Start of the actual period
   * @param actualEndDate - End of the actual period  
   * @param userId - User making the request
   * @param request - Express request object
   * @returns Promise<ForecastCalculationResultDto>
   */
  async calculateHistoricalValues(
    forecastId: string,
    actualStartDate: Date,
    actualEndDate: Date,
    userId: string,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    this.logger.log(`[ForecastCalculation] [CombinedCalculation] Executing combined calculation for period ${actualStartDate.toISOString()} to ${actualEndDate.toISOString()}`);
    
    try {
      // Get forecast and organization data
      const forecast = await this.forecastService.findOne(forecastId, userId, request);
      if (!forecast) {
        throw new NotFoundException(`Forecast not found: ${forecastId}`);
      }

      const organizationId = forecast.organizationId;
      if (!organizationId) {
        throw new BadRequestException('Forecast must belong to an organization');
      }

      // Execute the comprehensive calculation (historical + forecast + budget)
      const calculationResult = await this.executeComprehensiveCalculation(
        forecastId,
        forecast,
        actualStartDate,
        actualEndDate,
        userId,
        request
      );

      // Store the results
      const storedResult = await this.storeCalculationResults(
        forecastId,
        organizationId,
        calculationResult,
        actualStartDate,
        actualEndDate,
        request
      );

      this.logger.log(`[ForecastCalculation] [CombinedCalculation] Combined calculation completed successfully`);
      return storedResult;

    } catch (error) {
      this.logger.error(`[ForecastCalculation] [CombinedCalculation] Combined calculation failed:`, error);
      throw error;
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
  ): Promise<ExtendedForecastCalculationResult> {
    try {
      this.logger.log(`[ForecastCalculation] Starting real calculation engine execution`);
      
      // Validate data integrity first
      this.validateDataIntegrity(nodes, edges);
      
      // Initialize calculation services - use injected calculation engine
      const graphConverter = new GraphConverter();
      const calculationEngine = this.legacyEngine;
      
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
      const clientNodes = nodes.map(n => this.convertNodeToClientFormat(n as any));
      const clientEdges = edges.map(e => this.convertEdgeToClientFormat(e as any));
      const trees = graphConverter.convertToTrees(clientNodes, clientEdges);
      this.logger.log(`[ForecastCalculation] Generated ${trees.length} calculation trees`);
      
      // Execute extended calculation to get all node results
      this.logger.log(`[ForecastCalculation] Executing extended calculation for period ${forecast.forecastStartDate} to ${forecast.forecastEndDate}`);
      const extendedResult = await calculationEngine.calculateForecastExtended(
        trees,
        new Date(`${forecast.forecastStartDate}T00:00:00.000Z`),
        new Date(`${forecast.forecastEndDate}T00:00:00.000Z`),
        variables
      );
      
      // Return the extended result with forecast ID (backward compatible as it extends ForecastCalculationResult)
      return {
        ...extendedResult,
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
   * Execute historical calculation using calculation engine
   * @private
   */
  private async executeHistoricalCalculation(
    forecastId: string,
    nodes: ForecastNodeClient[],
    edges: ForecastEdgeClient[],
    variables: Variable[],
    actualStartDate: Date,
    actualEndDate: Date
  ): Promise<ExtendedForecastCalculationResult> {
    try {
      this.logger.log(`[ForecastCalculation] Starting historical calculation engine execution`);
      
      // Validate data integrity first
      this.validateDataIntegrity(nodes, edges);
      
      // Initialize calculation services - use injected calculation engine
      const graphConverter = new GraphConverter();
      const calculationEngine = this.legacyEngine;
      
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
      const clientNodes = nodes.map(n => this.convertNodeToClientFormat(n as any));
      const clientEdges = edges.map(e => this.convertEdgeToClientFormat(e as any));
      const trees = graphConverter.convertToTrees(clientNodes, clientEdges);
      this.logger.log(`[ForecastCalculation] Generated ${trees.length} calculation trees`);
      
      // Execute historical calculation for actual period
      this.logger.log(`[ForecastCalculation] Executing historical calculation for period ${actualStartDate.toISOString()} to ${actualEndDate.toISOString()}`);
      const historicalResult = await calculationEngine.calculateHistoricalValues(
        trees,
        actualStartDate,
        actualEndDate,
        variables
      );
      
      // Return the historical result with forecast ID
      return {
        ...historicalResult,
        forecastId
      };
      
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Historical calculation execution failed:`, error);
      
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
        if (error.message.includes('Historical calculation failed')) {
          throw new BadRequestException(`Historical calculation error: ${error.message}`);
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
      }
      
      throw new InternalServerErrorException(
        `Historical calculation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  private async storeCalculationResultsLegacy(
    forecastId: string,
    organizationId: string,
    results: ExtendedForecastCalculationResult,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    try {
      const client = this.supabaseService.getClientForRequest(request);
      
      // Store the complete extended results in JSONB
      const storedResults = {
        metrics: results.metrics,
        allNodes: results.allNodes // Include all node results
      };
      
      const { data, error } = await client
        .from('forecast_calculation_results')
        .insert({
          forecast_id: forecastId,
          organization_id: organizationId,
          calculated_at: new Date().toISOString(),
          results: storedResults // Store both metrics and all nodes as JSONB
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
   * Store historical calculation results in the database
   * @private
   */
  private async storeHistoricalCalculationResults(
    forecastId: string,
    organizationId: string,
    results: ExtendedForecastCalculationResult,
    actualStartDate: Date,
    actualEndDate: Date,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    try {
      const client = this.supabaseService.getClientForRequest(request);
      
      // Store the historical results with metadata about the actual period
      const storedResults = {
        metrics: results.metrics,
        allNodes: results.allNodes,
        actualPeriod: {
          startDate: actualStartDate.toISOString(),
          endDate: actualEndDate.toISOString()
        },
        calculationType: 'historical' // Mark this as a historical calculation
      };
      
      const { data, error } = await client
        .from('forecast_calculation_results')
        .insert({
          forecast_id: forecastId,
          organization_id: organizationId,
          calculated_at: new Date().toISOString(),
          results: storedResults // Store historical results with metadata
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`[ForecastCalculation] Failed to store historical results:`, error);
        throw new InternalServerErrorException(`Failed to store historical calculation results: ${error.message}`);
      }

      return this.mapDatabaseResultToDto(data);
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Error storing historical calculation results:`, error);
      throw error;
    }
  }

  /**
   * Map database entity to DTO
   * @private
   */
  private mapDatabaseResultToDto(data: any): ForecastCalculationResultDto {
    const results = data.results || {};
    
    return {
      id: data.id,
      forecastId: data.forecast_id,
      calculatedAt: data.calculated_at,
      metrics: results.metrics || results || [], // Handle both old and new format
      allNodes: results.allNodes || undefined // Include extended node results if available
    };
  }

  /**
   * Execute combined calculation (historical + forecast + budget)
   * @private
   */
  private async executeComprehensiveCalculation(
    forecastId: string,
    forecast: ForecastDto,
    actualStartDate: Date,
    actualEndDate: Date,
    userId: string,
    request: Request
  ): Promise<ExtendedForecastCalculationResult> {
    try {
      this.logger.log(`[ForecastCalculation] Starting combined calculation engine execution`);

      // Fetch forecast graph (nodes and edges)
      const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
      const edges = await this.forecastEdgeService.findByForecast(forecastId, request);

      this.logger.log(`[ForecastCalculation] Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);

      // Fetch organization variables
      const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
      const variables = variablesResponse.variables || [];

      this.logger.log(`[ForecastCalculation] Variables loaded: ${variables.length} variables`);

      // Transform data for calculation engine
      const transformedNodes = this.transformNodesToCalculationFormat(nodes);
      const transformedEdges = this.transformEdgesToCalculationFormat(edges);
      const transformedVariables = this.transformVariablesToCalculationFormat(variables);

      this.logger.log(`[ForecastCalculation] Data transformed for combined calculation engine`);

      // Validate data integrity using transformed data
      this.validateDataIntegrity(transformedNodes, transformedEdges);

      // Initialize calculation engine - use injected legacy engine
      const graphConverter = new GraphConverter();
      const calculationEngine = this.legacyEngine;

      // Convert graph to calculation trees (validation happens inside convertToTrees)
      this.logger.log(`[ForecastCalculation] Converting graph to calculation trees`);
      const trees = graphConverter.convertToTrees(transformedNodes, transformedEdges);

      this.logger.log(`[ForecastCalculation] Converted ${trees.length} calculation trees`);

      // Execute combined calculation
      const forecastStartDate = new Date(`${forecast.forecastStartDate}T00:00:00.000Z`);
      const forecastEndDate = new Date(`${forecast.forecastEndDate}T00:00:00.000Z`);

      const result = await calculationEngine.calculateComprehensive(
        trees,
        forecastStartDate,
        forecastEndDate,
        actualStartDate,
        actualEndDate,
        transformedVariables
      );

      // Return result with the forecast ID set
      this.logger.log(`[ForecastCalculation] Combined calculation engine execution completed`);
      return {
        ...result,
        forecastId: forecastId
      };

    } catch (error) {
      this.logger.error(`[ForecastCalculation] Combined calculation execution failed:`, error);
      throw error;
    }
  }

  /**
   * Store calculation results in the database
   * @private
   */
  private async storeCalculationResults(
    forecastId: string,
    organizationId: string,
    results: ExtendedForecastCalculationResult,
    actualStartDate: Date,
    actualEndDate: Date,
    request: Request
  ): Promise<ForecastCalculationResultDto> {
    try {
      const client = this.supabaseService.getClientForRequest(request);
      
      // Store the complete combined results in JSONB
      const storedResults = {
        metrics: results.metrics,
        allNodes: results.allNodes,
        actualPeriod: {
          startDate: actualStartDate.toISOString(),
          endDate: actualEndDate.toISOString()
        },
        calculationType: 'combined' // Mark as combined calculation
      };
      
      const { data, error } = await client
        .from('forecast_calculation_results')
        .insert({
          forecast_id: forecastId,
          organization_id: organizationId,
          calculated_at: new Date().toISOString(),
          results: storedResults
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`[ForecastCalculation] Failed to store combined results:`, error);
        throw new InternalServerErrorException(`Failed to store combined calculation results: ${error.message}`);
      }

      return this.mapDatabaseResultToDto(data);
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Error storing combined calculation results:`, error);
      throw error;
    }
  }

  /**
   * Load calculation trees for a forecast (same graph conversion as unified calculation).
   * Used by debug calculation to populate the calculation tree before running the engine.
   */
  async loadCalculationTreesForForecast(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<CalculationTree[]> {
    const forecast = await this.forecastService.findOne(forecastId, userId, request);
    if (!forecast) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }
    const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
    const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
    const graphConverter = new GraphConverter();
    const clientNodes = nodes.map((node) => this.convertNodeToClientFormat(node));
    const clientEdges = edges.map((edge) => this.convertEdgeToClientFormat(edge));
    return graphConverter.convertToCalculationTrees(clientNodes, clientEdges);
  }

  /**
   * Phase 3: Unified calculation method
   * Calculate all value types (historical, forecast, budget) using periods from forecast metadata
   * @param forecastId UUID of the forecast to calculate
   * @param userId UUID of the requesting user
   * @param request Express request object
   * @param calculationRequest Request containing calculation types and options
   * @returns Promise resolving to unified calculation results
   */
  async calculateForecastWithPeriods(
    forecastId: string,
    userId: string,
    request: Request,
    calculationRequest: UnifiedCalculationRequestDto
  ): Promise<UnifiedCalculationResultDto> {
    try {
      this.logger.log(`[ForecastCalculation] Starting comprehensive calculation for forecast ${forecastId} by user ${userId}`);
      this.logger.log(`[ForecastCalculation] Calculation types: [${calculationRequest.calculationTypes.join(', ')}]`);
      this.logger.log(`[ForecastCalculation] Include intermediate nodes: ${calculationRequest.includeIntermediateNodes}`);
      this.logger.log(`[ForecastCalculation] Using ${this.useNewEngine ? 'NEW' : 'LEGACY'} calculation engine`);

      if (this.useNewEngine) {
        return await this.calculateWithNewEngine(forecastId, userId, request, calculationRequest);
      } else {
        return await this.calculateWithLegacyEngine(forecastId, userId, request, calculationRequest);
      }
    } catch (error) {
      this.logger.error(`[ForecastCalculation] Comprehensive calculation failed for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate using the new refactored engine
   */
  private async calculateWithNewEngine(
    forecastId: string,
    userId: string,
    request: Request,
    calculationRequest: UnifiedCalculationRequestDto
  ): Promise<UnifiedCalculationResultDto> {
    this.logger.log(`[ForecastCalculation] [NEW ENGINE] Processing forecast ${forecastId}`);

    // 1. Fetch and validate forecast with period metadata
    const forecast = await this.forecastService.findOne(forecastId, userId, request);
    if (!forecast) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }

    // 2. Extract period information
    const periodInfo = this.extractPeriodInfoFromForecast(forecast);
    this.logger.log(`[ForecastCalculation] [NEW ENGINE] Period info:`, JSON.stringify(periodInfo, null, 2));

    // 3. Fetch forecast graph and variables
    const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
    const edges = await this.forecastEdgeService.findByForecast(forecastId, request);
    const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
    const variables = variablesResponse.variables || [];

    // 4. Convert to new engine format
    const graphConverter = new GraphConverter();
    const clientNodes = nodes.map(node => this.convertNodeToClientFormat(node));
    const clientEdges = edges.map(edge => this.convertEdgeToClientFormat(edge));
    const trees = graphConverter.convertToCalculationTrees(clientNodes, clientEdges);

    const newRequest: import('./calculation-engine/types/calculation-types').CalculationRequest = {
      trees,
      periods: {
        forecast: {
          start: periodInfo.forecastStartMonth,
          end: periodInfo.forecastEndMonth
        },
        actual: {
          start: periodInfo.actualStartMonth,
          end: periodInfo.actualEndMonth
        }
      },
      calculationTypes: calculationRequest.calculationTypes.map(type => type.toLowerCase() as any),
      includeAllNodes: calculationRequest.includeIntermediateNodes || false,
      variables: variables.map(v => this.convertVariableToEngineFormat(v))
    };

    // 5. Execute calculation with new engine
    const result = await this.newEngine.calculate(newRequest);

    // 6. Convert result back to DTO format
    const unifiedResult: UnifiedCalculationResultDto = {
      id: '', // Will be set when stored
      forecastId,
      calculatedAt: result.calculatedAt.toISOString(),
      calculationTypes: result.calculationTypes.map(type => type.toUpperCase() as any),
      periodInfo: {
        forecastStartMonth: result.periodInfo.forecastStartMonth || periodInfo.forecastStartMonth,
        forecastEndMonth: result.periodInfo.forecastEndMonth || periodInfo.forecastEndMonth,
        actualStartMonth: result.periodInfo.actualStartMonth || periodInfo.actualStartMonth,
        actualEndMonth: result.periodInfo.actualEndMonth || periodInfo.actualEndMonth
      },
      metrics: this.convertToUnifiedNodeResultDto(result.nodeResults.filter(n => n.nodeType === 'METRIC')),
      allNodes: calculationRequest.includeIntermediateNodes 
        ? this.convertToUnifiedNodeResultDto(result.nodeResults)
        : []
    };

    // 7. Store results — CalculationResult uses `nodeResults`, not `metrics`/`allNodes`.
    // Passing `result` into storeCalculationResults left JSONB without series data (undefined keys).
    const unifiedForStore: UnifiedCalculationResult = {
      forecastId,
      calculatedAt: result.calculatedAt,
      calculationTypes: result.calculationTypes,
      periodInfo: {
        forecastStartMonth: result.periodInfo.forecastStartMonth,
        forecastEndMonth: result.periodInfo.forecastEndMonth,
        actualStartMonth: result.periodInfo.actualStartMonth,
        actualEndMonth: result.periodInfo.actualEndMonth,
      },
      metrics: this.convertToUnifiedNodeResultDto(
        result.nodeResults.filter((n) => n.nodeType === 'METRIC')
      ) as unknown as UnifiedCalculationResult['metrics'],
      allNodes: (calculationRequest.includeIntermediateNodes
        ? this.convertToUnifiedNodeResultDto(result.nodeResults)
        : []) as unknown as UnifiedCalculationResult['allNodes'],
    };

    const storedResult = await this.storeUnifiedCalculationResults(
      forecastId,
      forecast.organizationId,
      unifiedForStore,
      request
    );

    // Create new result object instead of modifying readonly property
    const finalResult: UnifiedCalculationResultDto = {
      ...unifiedResult,
      id: storedResult.id,
    };
    return finalResult;
  }

  /**
   * Calculate using the legacy engine (existing implementation)
   */
  private async calculateWithLegacyEngine(
    forecastId: string,
    userId: string,
    request: Request,
    calculationRequest: UnifiedCalculationRequestDto
  ): Promise<UnifiedCalculationResultDto> {
    this.logger.log(`[ForecastCalculation] [LEGACY ENGINE] Processing forecast ${forecastId}`);

    // 1. Fetch and validate forecast with period metadata
    const forecast = await this.forecastService.findOne(forecastId, userId, request);
    if (!forecast) {
      throw new NotFoundException(`Forecast ${forecastId} not found`);
    }

    this.logger.log(`[ForecastCalculation] [Unified] Forecast found: ${forecast.name}`);

    // 2. Extract or generate period information from forecast metadata
    const periodInfo = this.extractPeriodInfoFromForecast(forecast);
    this.logger.log(`[ForecastCalculation] [Unified] Period info: Forecast ${periodInfo.forecastStartMonth} to ${periodInfo.forecastEndMonth}, Actual ${periodInfo.actualStartMonth} to ${periodInfo.actualEndMonth}`);

    // 3. Fetch forecast graph (nodes and edges)
    const nodes = await this.forecastNodeService.findByForecast(forecastId, request);
    const edges = await this.forecastEdgeService.findByForecast(forecastId, request);

    this.logger.log(`[ForecastCalculation] [Unified] Graph loaded: ${nodes.length} nodes, ${edges.length} edges`);

    // 4. Fetch organization variables for calculation
    const variablesResponse = await this.dataIntakeService.getVariablesByUser(userId, request);
    const variables = variablesResponse.variables || [];

    this.logger.log(`[ForecastCalculation] [Unified] Variables loaded: ${variables.length} variables`);

    // 5. Transform data for calculation engine
    const transformedNodes = this.transformNodesToCalculationFormat(nodes);
    const transformedEdges = this.transformEdgesToCalculationFormat(edges);
    const transformedVariables = this.transformVariablesToCalculationFormat(variables);

    this.logger.log(`[ForecastCalculation] [Unified] Data transformed for unified calculation engine`);

    // 6. Execute unified calculation
    const calculationResult = await this.executeUnifiedCalculation(
      forecastId,
      transformedNodes,
      transformedEdges,
      transformedVariables,
      periodInfo,
      calculationRequest
    );

    // 7. Store unified calculation results
    const storedResult = await this.storeUnifiedCalculationResults(
      forecastId,
      forecast.organizationId,
      calculationResult,
      request
    );

    this.logger.log(`[ForecastCalculation] [Unified] Unified calculation completed and stored for forecast ${forecastId}`);
    return storedResult;
  }

  /**
   * Extract period information from forecast metadata or generate defaults
   * @private
   */
  private extractPeriodInfoFromForecast(forecast: any): PeriodInfoDto {
    // Use MM-YYYY fields if available, otherwise generate from date fields
    const forecastStartMonth = forecast.forecastStartMonth || 
      this.dateToMMYYYY(new Date(forecast.forecastStartDate));
    const forecastEndMonth = forecast.forecastEndMonth || 
      this.dateToMMYYYY(new Date(forecast.forecastEndDate));
    
    // Generate actual period defaults (6 months before forecast start to 1 month before)
    let actualStartMonth = forecast.actualStartMonth || 
      this.subtractMonths(forecastStartMonth, 6);
    let actualEndMonth = forecast.actualEndMonth || 
      this.subtractMonths(forecastStartMonth, 1);

    const normalized = this.normalizeActualPeriodsForCalculation(
      forecastStartMonth,
      forecastEndMonth,
      actualStartMonth,
      actualEndMonth
    );
    if (
      normalized.actualStart !== actualStartMonth ||
      normalized.actualEnd !== actualEndMonth
    ) {
      this.logger.warn(
        `[ForecastCalculation] Adjusted overlapping actual period for engine validation: ` +
          `${actualStartMonth}–${actualEndMonth} → ${normalized.actualStart}–${normalized.actualEnd} ` +
          `(forecast ${forecastStartMonth}–${forecastEndMonth})`
      );
      actualStartMonth = normalized.actualStart;
      actualEndMonth = normalized.actualEnd;
    }

    const periodInfo: PeriodInfoDto = {
      forecastStartMonth,
      forecastEndMonth,
      actualStartMonth,
      actualEndMonth
    };

    return periodInfo;
  }

  /**
   * Actual and forecast windows must not share any MM-YYYY month (PeriodService validation).
   * UI/DB can store overlapping ranges (e.g. "actual through last month" while forecast starts this year).
   */
  private normalizeActualPeriodsForCalculation(
    forecastStart: string,
    forecastEnd: string,
    actualStart: string,
    actualEnd: string
  ): { actualStart: string; actualEnd: string } {
    if (!this.actualAndForecastPeriodsOverlap(actualStart, actualEnd, forecastStart, forecastEnd)) {
      return { actualStart, actualEnd };
    }

    const lastMonthBeforeForecast = this.subtractMonths(forecastStart, 1);
    let end = actualEnd;
    let start = actualStart;

    if (this.compareMonthsMM(end, lastMonthBeforeForecast) > 0) {
      end = lastMonthBeforeForecast;
    }
    if (this.compareMonthsMM(start, end) > 0) {
      start = this.subtractMonths(end, 5);
    }

    return { actualStart: start, actualEnd: end };
  }

  private actualAndForecastPeriodsOverlap(
    actualStart: string,
    actualEnd: string,
    forecastStart: string,
    forecastEnd: string
  ): boolean {
    return (
      this.compareMonthsMM(actualEnd, forecastStart) >= 0 &&
      this.compareMonthsMM(actualStart, forecastEnd) <= 0
    );
  }

  private compareMonthsMM(a: string, b: string): number {
    const [m1, y1] = a.split('-').map(Number);
    const [m2, y2] = b.split('-').map(Number);
    if (y1 !== y2) {
      return y1 - y2;
    }
    return m1 - m2;
  }

  /**
   * Execute unified calculation using calculation engine
   * @private
   */
  private async executeUnifiedCalculation(
    forecastId: string,
    nodes: ForecastNodeClient[],
    edges: ForecastEdgeClient[],
    variables: Variable[],
    periodInfo: PeriodInfoDto,
    calculationRequest: UnifiedCalculationRequestDto
  ): Promise<UnifiedCalculationResult> {
    try {
      this.logger.log(`[ForecastCalculation] [Unified] Starting unified calculation engine execution`);
      
      // Validate data integrity first
      this.validateDataIntegrity(nodes, edges);
      
      // Initialize calculation services - use injected calculation engine
      const graphConverter = new GraphConverter();
      const calculationEngine = this.legacyEngine;
      
      // Validate graph and convert to calculation trees
      this.logger.log(`[ForecastCalculation] [Unified] Validating graph structure`);
      const validation = graphConverter.validateGraph(nodes, edges);
      
      if (!validation.isValid) {
        this.logger.error(`[ForecastCalculation] [Unified] Graph validation failed:`, validation.errors);
        throw new BadRequestException(`Invalid forecast graph: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        this.logger.warn(`[ForecastCalculation] [Unified] Graph validation warnings:`, validation.warnings);
      }
      
      // Convert graph to calculation trees
      this.logger.log(`[ForecastCalculation] [Unified] Converting graph to calculation trees`);
      const clientNodes = nodes.map(n => this.convertNodeToClientFormat(n as any));
      const clientEdges = edges.map(e => this.convertEdgeToClientFormat(e as any));
      const trees = graphConverter.convertToTrees(clientNodes, clientEdges);
      this.logger.log(`[ForecastCalculation] [Unified] Generated ${trees.length} calculation trees`);
      
      // Convert DTO calculation types to engine types
      const engineCalculationTypes: CalculationType[] = calculationRequest.calculationTypes.map(
        (type: CalculationTypeDto) => type as CalculationType
      );

      // Prepare unified calculation request for engine
      const unifiedRequest: UnifiedCalculationRequest = {
        calculationTypes: engineCalculationTypes,
        includeIntermediateNodes: calculationRequest.includeIntermediateNodes
      };
      
      // Execute unified calculation
      this.logger.log(`[ForecastCalculation] [Unified] Executing unified calculation for periods`);
      const result = await calculationEngine.calculateWithPeriods(
        trees,
        periodInfo.forecastStartMonth,
        periodInfo.forecastEndMonth,
        periodInfo.actualStartMonth,
        periodInfo.actualEndMonth,
        variables,
        unifiedRequest
      );
      
      // Return the result with forecast ID set
      this.logger.log(`[ForecastCalculation] [Unified] Unified calculation engine execution completed`);
      return {
        ...result,
        forecastId: forecastId
      };
      
    } catch (error) {
      this.logger.error(`[ForecastCalculation] [Unified] Unified calculation execution failed:`, error);
      
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
        if (error.message.includes('Invalid MM-YYYY')) {
          throw new BadRequestException(`Period format error: ${error.message}`);
        }
      }
      
      throw new InternalServerErrorException(`Unified calculation execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store unified calculation results in database
   * @private
   */
  private async storeUnifiedCalculationResults(
    forecastId: string,
    organizationId: string,
    results: UnifiedCalculationResult,
    request: Request
  ): Promise<UnifiedCalculationResultDto> {
    try {
      this.logger.log(`[ForecastCalculation] [Unified] Storing unified calculation results for forecast ${forecastId}`);

      const client = this.supabaseService.getClientForRequest(request);

      // Prepare unified results for storage
      const storedResults = {
        metrics: results.metrics,
        allNodes: results.allNodes,
        periodInfo: results.periodInfo,
        calculationTypes: results.calculationTypes
      };

      const { data, error } = await client
        .from('forecast_calculation_results')
        .insert({
          forecast_id: forecastId,
          organization_id: organizationId,
          calculated_at: results.calculatedAt.toISOString(),
          results: storedResults
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`[ForecastCalculation] [Unified] Failed to store unified results:`, error);
        throw new InternalServerErrorException(`Failed to store unified calculation results: ${error.message}`);
      }

      this.logger.log(`[ForecastCalculation] [Unified] Unified calculation results stored successfully`);

      // Convert database result to DTO
      return this.mapUnifiedDatabaseResultToDto(data);

    } catch (error) {
      this.logger.error(`[ForecastCalculation] [Unified] Error storing unified calculation results:`, error);
      throw error;
    }
  }

  /**
   * Map unified database result to DTO format
   * @private
   */
  private mapUnifiedDatabaseResultToDto(dbResult: any): UnifiedCalculationResultDto {
    const results = dbResult.results;
    
    return {
      id: dbResult.id,
      forecastId: dbResult.forecast_id,
      calculatedAt: dbResult.calculated_at,
      calculationTypes: results.calculationTypes || ['forecast'], // Default fallback
      periodInfo: results.periodInfo || {
        forecastStartMonth: '01-2023',
        forecastEndMonth: '12-2023',
        actualStartMonth: '07-2022',
        actualEndMonth: '12-2022'
      },
      metrics: results.metrics || [],
      allNodes: results.allNodes || undefined
    };
  }

  /**
   * MM-YYYY utility methods
   * @private
   */
  private dateToMMYYYY(date: Date): string {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = String(date.getUTCFullYear());
    return `${month}-${year}`;
  }

  private subtractMonths(mmyyyy: string, monthsToSubtract: number): string {
    const [monthStr, yearStr] = mmyyyy.split('-');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    let newMonth = month - monthsToSubtract;
    let newYear = year;

    while (newMonth <= 0) {
      newMonth += 12;
      newYear--;
    }

    return `${String(newMonth).padStart(2, '0')}-${newYear}`;
  }

  /**
   * Convert unified result to legacy format for backward compatibility
   * @private
   */
  private convertToLegacyDto(result: UnifiedCalculationResultDto): ForecastCalculationResultDto {
    // Convert unified metrics to legacy format
    const metrics = result.metrics.map(metric => ({
      metricNodeId: metric.nodeId,
      values: metric.values.map(value => ({
        date: this.mmyyyyToDate(value.month).toISOString(),
        forecast: value.forecast,
        budget: value.budget,
        historical: value.historical
      }))
    }));

    // Convert unified allNodes to legacy format if available
    const allNodes = result.allNodes?.map(node => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType as 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED',
      values: node.values.map(value => ({
        date: this.mmyyyyToDate(value.month).toISOString(),
        forecast: value.forecast,
        budget: value.budget,
        historical: value.historical,
        calculated: value.calculated
      }))
    }));

    return {
      id: result.id,
      forecastId: result.forecastId,
      calculatedAt: result.calculatedAt,
      metrics,
      allNodes
    };
  }

  /**
   * Convert MM-YYYY back to Date for legacy compatibility
   * @private
   */
  private mmyyyyToDate(mmyyyy: string): Date {
    const [monthStr, yearStr] = mmyyyy.split('-');
    const month = parseInt(monthStr, 10) - 1; // Date months are 0-indexed
    const year = parseInt(yearStr, 10);
    return new Date(year, month, 1); // First day of the month
  }

  /**
   * Get latest unified calculation results for a forecast
   * @param forecastId UUID of the forecast
   * @param userId UUID of the requesting user
   * @param request Express request object
   * @returns Promise resolving to latest unified calculation results or null
   */
  async getLatestUnifiedCalculationResults(
    forecastId: string,
    userId: string,
    request: Request
  ): Promise<UnifiedCalculationResultDto | null> {
    try {
      this.logger.log(`[ForecastCalculation] [Unified] Getting latest unified calculation results for forecast ${forecastId}`);

      // Verify user has access to the forecast
      const forecast = await this.forecastService.findOne(forecastId, userId, request);
      if (!forecast) {
        throw new NotFoundException(`Forecast ${forecastId} not found`);
      }

      const client = this.supabaseService.getClientForRequest(request);

      const { data, error } = await client
        .from('forecast_calculation_results')
        .select()
        .eq('forecast_id', forecastId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error(`[ForecastCalculation] [Unified] Failed to fetch unified calculation results:`, error);
        throw new InternalServerErrorException(`Failed to fetch unified calculation results: ${error.message}`);
      }

      if (!data) {
        this.logger.log(`[ForecastCalculation] [Unified] No unified calculation results found for forecast ${forecastId}`);
        return null;
      }

      // Check if this is a unified result (has calculationTypes and periodInfo)
      const results = data.results;
      if (results && results.calculationTypes && results.periodInfo) {
        this.logger.log(`[ForecastCalculation] [Unified] Found unified calculation results for forecast ${forecastId}`);
        return this.mapUnifiedDatabaseResultToDto(data);
      } else {
        // Legacy result - convert to unified format
        this.logger.log(`[ForecastCalculation] [Unified] Found legacy calculation results for forecast ${forecastId}, converting to unified format`);
        return this.convertLegacyToUnifiedDto(data, forecast);
      }

    } catch (error) {
      this.logger.error(`[ForecastCalculation] [Unified] Error getting unified calculation results:`, error);
      throw error;
    }
  }

  /**
   * Convert legacy calculation results to unified format
   * @private
   */
  private convertLegacyToUnifiedDto(dbResult: any, forecast: any): UnifiedCalculationResultDto {
    const results = dbResult.results;
    const periodInfo = this.extractPeriodInfoFromForecast(forecast);

    // Convert legacy metrics to unified node results
    const metrics: UnifiedNodeResultDto[] = (results.metrics || []).map((metric: any) => ({
      nodeId: metric.metricNodeId,
      nodeType: 'METRIC',
      values: (metric.values || []).map((value: any) => ({
        month: this.dateToMMYYYY(new Date(value.date)),
        historical: value.historical,
        forecast: value.forecast,
        budget: value.budget,
        calculated: null
      }))
    }));

    // Convert legacy allNodes if available
    const allNodes: UnifiedNodeResultDto[] | undefined = results.allNodes?.map((node: any) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      values: (node.values || []).map((value: any) => ({
        month: this.dateToMMYYYY(new Date(value.date)),
        historical: value.historical,
        forecast: value.forecast,
        budget: value.budget,
        calculated: value.calculated
      }))
    }));

    return {
      id: dbResult.id,
      forecastId: dbResult.forecast_id,
      calculatedAt: dbResult.calculated_at,
      calculationTypes: [CalculationTypeDto.FORECAST], // Legacy results were forecast-only
      periodInfo,
      metrics,
      allNodes
    };
  }

  /**
   * Convert NodeResult to UnifiedNodeResultDto
   */
  private convertToUnifiedNodeResultDto(nodeResults: import('./calculation-engine/types/calculation-types').NodeResult[]): UnifiedNodeResultDto[] {
    return nodeResults.map(node => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType as any,
      values: node.values.map(value => ({
        month: value.month,
        historical: value.historical,
        forecast: value.forecast,
        budget: value.budget,
        calculated: value.calculated
      } as UnifiedMonthlyValueDto))
    }));
  }

  /**
   * Convert ForecastNodeDto to ForecastNodeClient format for calculation engine
   */
  private convertNodeToClientFormat(node: import('../dto/forecast-node.dto').ForecastNodeDto): import('./calculation-engine/types').ForecastNodeClient {
    return {
      id: node.id,
      type: node.kind as any,
      data: node.attributes,
      position: node.position || { x: 0, y: 0 }
    };
  }

  /**
   * Convert ForecastEdgeDto to ForecastEdgeClient format for calculation engine
   */
  private convertEdgeToClientFormat(edge: import('../dto/forecast-edge.dto').ForecastEdgeDto): import('./calculation-engine/types').ForecastEdgeClient {
    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId
    };
  }

  /**
   * Convert Variable from database format to calculation engine format
   */
  private convertVariableToEngineFormat(variable: any): import('./calculation-engine/types/calculation-types').Variable {
    return {
      id: variable.id,
      name: variable.name,
      type: variable.type,
      organizationId: variable.organizationId || variable.organization_id,
      timeSeries: (variable.values || []).map((v: any) => ({
        date: new Date(v.date),
        value: v.value
      }))
    };
  }

} 