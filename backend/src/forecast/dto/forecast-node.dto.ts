import { IsNotEmpty, IsString, IsUUID, IsOptional, IsJSON, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum ForecastNodeKind {
  DATA = 'DATA',
  CONSTANT = 'CONSTANT',
  OPERATOR = 'OPERATOR',
  METRIC = 'METRIC',
  SEED = 'SEED'
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface DataNodeAttributes {
  name: string;
  variableId: string;
  offsetMonths: number;
}

export interface ConstantNodeAttributes {
  name: string;
  value: number;
}

export interface OperatorNodeAttributes {
  op: '+' | '-' | '*' | '/' | '^' | 'offset';
  inputOrder: string[];
  /** Months to lag backward; used when op === 'offset' */
  offsetMonths?: number;
}

/** How calendar-year FY totals aggregate: stock = December point-in-time; flow = sum of months. */
export type MetricSeriesKind = 'stock' | 'flow';

export interface MetricNodeAttributes {
  label: string;
  budgetVariableId: string;
  historicalVariableId: string;
  useCalculated: boolean;
  /** Defaults to flow when omitted (backward compatible). */
  metricSeriesKind?: MetricSeriesKind;
}

export interface SeedNodeAttributes {
  sourceMetricId: string;
}

export type NodeAttributes = 
  | DataNodeAttributes
  | ConstantNodeAttributes
  | OperatorNodeAttributes
  | MetricNodeAttributes
  | SeedNodeAttributes;

export class CreateForecastNodeDto {
  @IsNotEmpty()
  @IsUUID()
  forecastId: string;

  @IsNotEmpty()
  @IsEnum(ForecastNodeKind)
  kind: ForecastNodeKind;

  @IsNotEmpty()
  @IsObject()
  attributes: NodeAttributes;

  @IsNotEmpty()
  @IsObject()
  position: NodePosition;
}

export class UpdateForecastNodeDto {
  @IsOptional()
  @IsEnum(ForecastNodeKind)
  kind?: ForecastNodeKind;

  @IsOptional()
  @IsObject()
  attributes?: NodeAttributes;

  @IsOptional()
  @IsObject()
  position?: NodePosition;
}

export class ForecastNodeDto {
  @IsUUID()
  id: string;

  @IsUUID()
  forecastId: string;

  @IsEnum(ForecastNodeKind)
  kind: ForecastNodeKind;

  attributes: NodeAttributes;
  position: NodePosition;

  createdAt: Date;
  updatedAt: Date;
} 