import { IsNotEmpty, IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateForecastEdgeDto {
  @IsNotEmpty()
  @IsUUID()
  forecastId: string;

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