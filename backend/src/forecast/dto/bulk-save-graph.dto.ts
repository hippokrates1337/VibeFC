import { IsNotEmpty, IsArray, ValidateNested, IsString, IsObject, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// Regex pattern for MM-YYYY format validation
const MM_YYYY_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;

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

  // New MM-YYYY period fields
  @IsOptional()
  @IsString()
  @Matches(MM_YYYY_PATTERN, { message: 'forecastStartMonth must be in MM-YYYY format' })
  forecastStartMonth?: string;

  @IsOptional()
  @IsString()
  @Matches(MM_YYYY_PATTERN, { message: 'forecastEndMonth must be in MM-YYYY format' })
  forecastEndMonth?: string;

  @IsOptional()
  @IsString()
  @Matches(MM_YYYY_PATTERN, { message: 'actualStartMonth must be in MM-YYYY format' })
  actualStartMonth?: string;

  @IsOptional()
  @IsString()
  @Matches(MM_YYYY_PATTERN, { message: 'actualEndMonth must be in MM-YYYY format' })
  actualEndMonth?: string;
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