import { Controller, Post, Get, Param, Request, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ForecastCalculationService } from '../services/forecast-calculation.service';
import { ForecastCalculationResultDto, CalculationHealthDto } from '../dto/calculation.dto';

/**
 * Controller for forecast calculation endpoints
 * Handles calculation triggers and result retrieval
 */
@Controller('forecasts')
@UseGuards(JwtAuthGuard)
export class ForecastCalculationController {
  private readonly logger = new Logger(ForecastCalculationController.name);

  constructor(
    private readonly forecastCalculationService: ForecastCalculationService
  ) {}

  /**
   * Trigger forecast calculation
   * @param forecastId UUID of the forecast to calculate
   * @param req Request object containing user information
   * @returns Promise resolving to calculation results
   */
  @Post(':forecastId/calculate')
  async calculateForecast(
    @Param('forecastId') forecastId: string,
    @Request() req: any
  ): Promise<ForecastCalculationResultDto> {
    try {
      this.logger.log(`[ForecastCalculationController] Calculate forecast ${forecastId} requested by user ${req.user.id}`);
      
      const result = await this.forecastCalculationService.calculateForecast(
        forecastId,
        req.user.id
      );

      this.logger.log(`[ForecastCalculationController] Calculation completed for forecast ${forecastId}`);
      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] Calculation failed for forecast ${forecastId}:`, error);
      throw error;
    }
  }

  /**
   * Get latest calculation results
   * @param forecastId UUID of the forecast
   * @param req Request object containing user information
   * @returns Promise resolving to latest calculation results or null
   */
  @Get(':forecastId/calculation-results')
  async getCalculationResults(
    @Param('forecastId') forecastId: string,
    @Request() req: any
  ): Promise<ForecastCalculationResultDto | null> {
    try {
      this.logger.log(`[ForecastCalculationController] Get calculation results for forecast ${forecastId} requested by user ${req.user.id}`);
      
      const result = await this.forecastCalculationService.getLatestCalculationResults(
        forecastId,
        req.user.id
      );

      if (result) {
        this.logger.log(`[ForecastCalculationController] Found calculation results for forecast ${forecastId}`);
      } else {
        this.logger.log(`[ForecastCalculationController] No calculation results found for forecast ${forecastId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`[ForecastCalculationController] Failed to get calculation results for forecast ${forecastId}:`, error);
      throw error;
    }
  }

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
        req.user.id
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
} 