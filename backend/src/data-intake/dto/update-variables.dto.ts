import { IsArray, IsUUID, IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VariableDto, VariableType, TimeSeriesPoint } from './variable.dto';

export class UpdateVariableDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(VariableType)
  type?: VariableType;

  @IsOptional()
  @IsArray()
  values?: TimeSeriesPoint[];
}

export class UpdateVariablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariableDto)
  variables: UpdateVariableDto[];
} 