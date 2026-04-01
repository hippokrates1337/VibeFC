import { Controller, Post, Get, Param, Request, UseGuards, Logger, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ForecastCalculationService } from '../services/forecast-calculation.service';
import { DebugCalculationService } from '../services/debug-calculation.service';
import { 
  ForecastCalculationResultDto, 
  CalculationHealthDto,
  UnifiedCalculationRequestDto,
  UnifiedCalculationResultDto
} from '../dto/calculation.dto';
import {
  DebugCalculationRequestDto,
  DebugCalculationResultDto,
  DebugCalculationTreeDto,
  CalculationTreeRequestDto
} from '../dto/debug-calculation.dto';

/**
 * Controller for forecast calculation endpoints
 * Handles calculation triggers and result retrieval
 */
@Controller('forecasts')
@UseGuards(JwtAuthGuard)
export class ForecastCalculationController {
  private readonly logger = new Logger(ForecastCalculationController.name);

  constructor(
    private readonly forecastCalculationService: ForecastCalculationService,
    private readonly debugCalculationService: DebugCalculationService
  ) {}

  /**
   * Phase 3: Unified calculation endpoint
   * Triggers all calculation types using periods from forecast metadata
   * @param forecastId UUID of the forecast to calculate
   * @param body Request body containing calculation types and options
   * @param req Request object containing user information
   * @returns Promise resolving to unified calculation results
   */
  @Post(':forecastId/calculate-unified')
  async calculateUnified(
    @Param('forecastId') forecastId: string,
    @Body() body: UnifiedCalculationRequestDto,
    @Request() req: any
  ): Promise<UnifiedCalculationResultDto> {
    try {
      this.logger.log(`[ForecastCalculationController] [Unified] Calculate unified for forecast ${forecastId} requested by user ${req.user.id}`);
      this.logger.log(`[ForecastCalculationController] [Unified] Calculation types: [${body.calculationTypes.join(', ')}]`);
      this.logger.log(`[ForecastCalculationController] [Unified] Include intermediate nodes: ${body.includeIntermediateNodes}`);
      
      const result = await this.forecastCalculationService.calculateForecastWithPeriods(
        forecastId,
        req.user.id,
        req,
        body
      );

      this.logger.log(`[ForecastCalculationController] [Unified] Unified calculation completed for forecast ${forecastId}`);
      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] [Unified] Unified calculation failed for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  // Phase 8: Deprecated calculateForecast endpoint removed - use calculateUnified instead

  /**
   * Get latest unified calculation results
   * @param forecastId UUID of the forecast
   * @param req Request object containing user information
   * @returns Promise resolving to latest unified calculation results or null
   */
  @Get(':forecastId/calculation-results-unified')
  async getUnifiedCalculationResults(
    @Param('forecastId') forecastId: string,
    @Request() req: any
  ): Promise<UnifiedCalculationResultDto | null> {
    try {
      this.logger.log(`[ForecastCalculationController] [Unified] Get unified calculation results for forecast ${forecastId} requested by user ${req.user.id}`);
      
      const result = await this.forecastCalculationService.getLatestUnifiedCalculationResults(
        forecastId,
        req.user.id,
        req
      );

      if (result) {
        this.logger.log(`[ForecastCalculationController] [Unified] Found unified calculation results for forecast ${forecastId}`);
      } else {
        this.logger.log(`[ForecastCalculationController] [Unified] No unified calculation results found for forecast ${forecastId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] [Unified] Failed to get unified calculation results for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  // Phase 8: Deprecated getCalculationResults endpoint removed - use getUnifiedCalculationResults instead

  /**
   * Get calculation history
   * @param forecastId UUID of the forecast
   * @param req Request object containing user information
   * @returns Promise resolving to array of historical calculation results
   */
  @Get(':forecastId/calculation-results/history')
  async getCalculationHistory(
    @Param('forecastId') forecastId: string,
    @Request() req: any
  ): Promise<ForecastCalculationResultDto[]> {
    try {
      this.logger.log(`[ForecastCalculationController] Get calculation history for forecast ${forecastId} requested by user ${req.user.id}`);
      
      const results = await this.forecastCalculationService.getCalculationHistory(
        forecastId,
        req.user.id,
        req
      );

      this.logger.log(`[ForecastCalculationController] Retrieved ${results.length} historical calculation results for forecast ${forecastId}`);
      return results;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] Failed to get calculation history for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for calculation service
   * @returns Health status and timestamp
   */
  @Get('calculation/health')
  async healthCheck(): Promise<CalculationHealthDto> {
    this.logger.log(`[ForecastCalculationController] Health check requested`);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================
  // DEBUG ENDPOINTS
  // ========================================

  /**
   * Debug calculation endpoint
   * Triggers calculation with comprehensive debug information
   * @param forecastId UUID of the forecast to calculate
   * @param body Debug calculation request with configuration
   * @param req Request object containing user information
   * @returns Promise resolving to debug calculation results
   */
  @Post(':forecastId/calculate-debug')
  async calculateWithDebug(
    @Param('forecastId') forecastId: string,
    @Body() body: DebugCalculationRequestDto,
    @Request() req: any
  ): Promise<DebugCalculationResultDto> {
    try {
      this.logger.log(`[ForecastCalculationController] [Debug] Debug calculation for forecast ${forecastId} requested by user ${req.user.id}`);
      this.logger.log(`[ForecastCalculationController] [Debug] Debug level: ${body.debugLevel || 'basic'}`);
      this.logger.log(`[ForecastCalculationController] [Debug] Calculation types: [${body.calculationTypes.join(', ')}]`);
      this.logger.log(`[ForecastCalculationController] [Debug] Include intermediate nodes: ${body.includeIntermediateNodes}`);
      this.logger.log(`[ForecastCalculationController] [Debug] Focus node IDs: ${body.focusNodeIds?.length || 0} nodes`);
      
      const result = await this.debugCalculationService.calculateWithDebug(
        forecastId,
        req.user.id,
        req,
        body
      );

      this.logger.log(`[ForecastCalculationController] [Debug] Debug calculation completed for forecast ${forecastId}`);
      this.logger.log(`[ForecastCalculationController] [Debug] Captured ${result.debugInfo.calculationSteps.length} calculation steps`);
      this.logger.log(`[ForecastCalculationController] [Debug] Total execution time: ${result.debugInfo.performanceMetrics.totalExecutionTimeMs}ms`);
      
      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] [Debug] Debug calculation failed for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  /**
   * Get calculation tree structure
   * Returns the calculation tree without performing full calculation
   * @param forecastId UUID of the forecast
   * @param req Request object containing user information
   * @returns Promise resolving to calculation tree structure
   */
  @Get(':forecastId/debug/calculation-tree')
  async getCalculationTree(
    @Param('forecastId') forecastId: string,
    @Request() req: any
  ): Promise<DebugCalculationTreeDto> {
    try {
      this.logger.log(`[ForecastCalculationController] [Debug] Get calculation tree for forecast ${forecastId} requested by user ${req.user.id}`);
      
      const result = await this.debugCalculationService.getCalculationTree(forecastId, req.user.id, req);

      this.logger.log(`[ForecastCalculationController] [Debug] Calculation tree retrieved for forecast ${forecastId}`);
      this.logger.log(`[ForecastCalculationController] [Debug] Tree contains ${result.totalNodes} nodes across ${result.trees.length} metric trees`);
      
      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] [Debug] Failed to get calculation tree for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed calculation steps
   * Returns step-by-step calculation information from the last debug calculation
   * @param forecastId UUID of the forecast
   * @param req Request object containing user information
   * @returns Promise resolving to array of calculation steps
   */
  @Get(':forecastId/debug/calculation-steps')
  async getCalculationSteps(
    @Param('forecastId') forecastId: string,
    @Request() req: any
  ): Promise<any[]> {
    try {
      this.logger.log(`[ForecastCalculationController] [Debug] Get calculation steps for forecast ${forecastId} requested by user ${req.user.id}`);
      
      const result = await this.debugCalculationService.getCalculationSteps(forecastId);

      this.logger.log(`[ForecastCalculationController] [Debug] Retrieved ${result.length} calculation steps for forecast ${forecastId}`);
      
      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] [Debug] Failed to get calculation steps for forecast ${forecastId}:`, error);
      throw error;
    }
  }
} 