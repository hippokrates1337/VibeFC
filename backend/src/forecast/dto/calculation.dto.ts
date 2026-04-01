import { IsUUID, IsDateString, IsObject, IsArray, IsString, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// Phase 8: CalculateForecastDto removed - use UnifiedCalculationRequestDto instead

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

// ========================================
// Phase 3: Unified Calculation DTOs
// ========================================

/**
 * Calculation types enum for unified calculations
 */
export enum CalculationTypeDto {
  HISTORICAL = 'historical',
  FORECAST = 'forecast',
  BUDGET = 'budget'
}

/**
 * DTO for unified calculation request
 */
export class UnifiedCalculationRequestDto {
  @IsArray()
  @IsEnum(CalculationTypeDto, { each: true })
  readonly calculationTypes: CalculationTypeDto[];

  @IsBoolean()
  readonly includeIntermediateNodes: boolean;
}

/**
 * DTO for unified monthly value with MM-YYYY identifier
 */
export class UnifiedMonthlyValueDto {
  @IsString()
  readonly month: string; // MM-YYYY format

  @IsOptional()
  @IsNumber()
  readonly historical: number | null;

  @IsOptional()
  @IsNumber()
  readonly forecast: number | null;

  @IsOptional()
  @IsNumber()
  readonly budget: number | null;

  @IsOptional()
  @IsNumber()
  readonly calculated: number | null; // For intermediate nodes
}

/**
 * DTO for unified node result
 */
export class UnifiedNodeResultDto {
  @IsUUID()
  readonly nodeId: string;

  @IsString()
  readonly nodeType: string; // 'DATA' | 'CONSTANT' | 'OPERATOR' | 'METRIC' | 'SEED'

  @IsArray()
  @Type(() => UnifiedMonthlyValueDto)
  readonly values: UnifiedMonthlyValueDto[];
}

/**
 * DTO for period information
 */
export class PeriodInfoDto {
  @IsString()
  readonly forecastStartMonth: string; // MM-YYYY

  @IsString()
  readonly forecastEndMonth: string; // MM-YYYY

  @IsString()
  readonly actualStartMonth: string; // MM-YYYY

  @IsString()
  readonly actualEndMonth: string; // MM-YYYY
}

/**
 * DTO for unified calculation result
 */
export class UnifiedCalculationResultDto {
  @IsUUID()
  readonly id: string;

  @IsUUID()
  readonly forecastId: string;

  @IsDateString()
  readonly calculatedAt: string;

  @IsArray()
  @IsEnum(CalculationTypeDto, { each: true })
  readonly calculationTypes: CalculationTypeDto[];

  @IsObject()
  @Type(() => PeriodInfoDto)
  readonly periodInfo: PeriodInfoDto;

  @IsArray()
  @Type(() => UnifiedNodeResultDto)
  readonly metrics: UnifiedNodeResultDto[]; // Only metric nodes

  @IsOptional()
  @IsArray()
  @Type(() => UnifiedNodeResultDto)
  readonly allNodes?: UnifiedNodeResultDto[]; // All nodes when includeIntermediateNodes = true
} 