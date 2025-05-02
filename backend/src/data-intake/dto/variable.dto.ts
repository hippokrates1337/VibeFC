import { IsArray, IsString, IsUUID, IsOptional, IsEnum, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum VariableType {
  ACTUAL = 'ACTUAL',
  BUDGET = 'BUDGET',
  INPUT = 'INPUT',
  UNKNOWN = 'UNKNOWN'
}

export class TimeSeriesPoint {
  @IsString()
  date: string;

  @IsOptional()
  value: number | null;
}

export class VariableDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(VariableType)
  @IsOptional()
  type?: VariableType;

  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @IsArray()
  values: TimeSeriesPoint[];
}

// Interface matching the Supabase database schema
export interface VariableEntity {
  id: string;
  name: string;
  type: VariableType;
  values: TimeSeriesPoint[];
  user_id: string;
  created_at: string;
  updated_at: string;
} 