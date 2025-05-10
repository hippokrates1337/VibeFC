import { IsArray, IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class DeleteVariablesDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  ids: string[];

  @IsOptional()
  @IsUUID()
  organizationId?: string;
} 