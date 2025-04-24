import { IsArray, IsUUID } from 'class-validator';

export class DeleteVariablesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
} 