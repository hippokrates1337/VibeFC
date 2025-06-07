import { IsUUID, IsDateString, IsObject, IsArray, IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for triggering forecast calculation
 */
export class CalculateForecastDto {
  @IsUUID()
  readonly forecastId: string;
}

/**
 * DTO for monthly forecast value
 */
export class MonthlyForecastValueDto {
  @IsDateString()
  readonly date: string;

  @IsOptional()
  @IsNumber()
  readonly forecast: number | null;

  @IsOptional()
  @IsNumber()
  readonly budget: number | null;

  @IsOptional()
  @IsNumber()
  readonly historical: number | null;
}

/**
 * DTO for metric calculation result
 */
export class MetricCalculationResultDto {
  @IsUUID()
  readonly metricNodeId: string;

  @IsArray()
  @Type(() => MonthlyForecastValueDto)
  readonly values: MonthlyForecastValueDto[];
}

/**
 * DTO for complete forecast calculation result
 */
export class ForecastCalculationResultDto {
  @IsUUID()
  readonly id: string;

  @IsUUID()
  readonly forecastId: string;

  @IsDateString()
  readonly calculatedAt: string;

  @IsArray()
  @Type(() => MetricCalculationResultDto)
  readonly metrics: MetricCalculationResultDto[];
}

/**
 * DTO for calculation health check response
 */
export class CalculationHealthDto {
  @IsString()
  readonly status: string;

  @IsDateString()
  readonly timestamp: string;
} 