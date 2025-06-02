import { IsNotEmpty, IsString, IsUUID, IsOptional, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateDateRange } from '../../validators/date-range.validator';

export class CreateForecastDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsDateString()
  forecastStartDate: string;

  @IsNotEmpty()
  @IsDateString()
  @ValidateDateRange('forecastStartDate', { message: 'End date must be after or equal to start date' })
  forecastEndDate: string;

  @IsNotEmpty()
  @IsUUID()
  organizationId: string;
}

export class UpdateForecastDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateString()
  forecastStartDate?: string;

  @IsOptional()
  @IsDateString()
  forecastEndDate?: string;
}

export class ForecastDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsDateString()
  forecastStartDate: string;

  @IsDateString()
  forecastEndDate: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  createdAt: Date;
  updatedAt: Date;
} 