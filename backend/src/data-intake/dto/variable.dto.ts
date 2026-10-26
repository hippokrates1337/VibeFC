import { IsArray, IsString, IsUUID, IsOptional, IsEnum, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum VariableType {
  ACTUAL = 'ACTUAL',
  BUDGET = 'BUDGET',
  INPUT = 'INPUT',
  UNKNOWN = 'UNKNOWN'
}

/** One month of a variable. `date` is 'YYYY-MM' or 'YYYY-MM-DD' (read as written); null value = no value. */
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
