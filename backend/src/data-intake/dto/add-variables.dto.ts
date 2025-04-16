import { IsArray, IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
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
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(VariableType)
  @IsOptional()
  type?: VariableType;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsArray()
  values: TimeSeriesPoint[];
}

export class AddVariablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableDto)
  variables: VariableDto[];
} 