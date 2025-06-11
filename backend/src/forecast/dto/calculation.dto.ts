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
 * DTO for extended monthly node value including calculated values
 */
export class MonthlyNodeValueDto extends MonthlyForecastValueDto {
  @IsOptional()
  @IsNumber()
  readonly calculated: number | null;
}

/**
 * DTO for node calculation result (all node types)
 */
export class NodeCalculationResultDto {
  @IsUUID()
  readonly nodeId: string;

  @IsString()
  readonly nodeType: 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED';

  @IsArray()
  @Type(() => MonthlyNodeValueDto)
  readonly values: MonthlyNodeValueDto[];
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

  @IsOptional()
  @IsArray()
  @Type(() => NodeCalculationResultDto)
  readonly allNodes?: NodeCalculationResultDto[];
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