import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class DeleteVariablesDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  ids: string[];
} 