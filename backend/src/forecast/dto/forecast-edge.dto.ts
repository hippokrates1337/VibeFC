import { IsNotEmpty, IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateForecastEdgeDto {
  /** Ignored: the forecast in the URL decides. Kept optional for older clients. */
  @IsOptional()
  @IsUUID()
  forecastId?: string;

  @IsNotEmpty()
  @IsUUID()
  sourceNodeId: string;

  @IsNotEmpty()
  @IsUUID()
  targetNodeId: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class UpdateForecastEdgeDto {
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  sourceNodeId?: string;

  @IsOptional()
  @IsUUID()
  targetNodeId?: string;
}

export class ForecastEdgeDto {
  @IsUUID()
  id: string;

  @IsUUID()
  forecastId: string;

  @IsUUID()
  sourceNodeId: string;

  @IsUUID()
  targetNodeId: string;

  createdAt: Date;
} 