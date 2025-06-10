import { IsNotEmpty, IsArray, ValidateNested, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ForecastMetadataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  forecastStartDate: string;

  @IsString()
  @IsNotEmpty()
  forecastEndDate: string;
}

export class BulkNodeDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  kind: string;

  @IsObject()
  attributes: Record<string, any>;

  @IsObject()
  position: { x: number; y: number };
}

export class BulkEdgeDto {
  @IsString()
  @IsNotEmpty()
  sourceClientId: string;

  @IsString()
  @IsNotEmpty()
  targetClientId: string;
}

export class BulkSaveGraphDto {
  @ValidateNested()
  @Type(() => ForecastMetadataDto)
  @IsNotEmpty()
  forecast: ForecastMetadataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkNodeDto)
  nodes: BulkNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEdgeDto)
  edges: BulkEdgeDto[];
}

export class FlattenedForecastWithDetailsDto {
  id: string;
  name: string;
  forecastStartDate: string;
  forecastEndDate: string;
  organizationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  edges: any[];
} 