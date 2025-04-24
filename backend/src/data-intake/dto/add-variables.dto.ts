import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VariableDto } from './variable.dto';

export class AddVariablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableDto)
  variables: VariableDto[];
} 