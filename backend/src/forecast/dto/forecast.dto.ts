import { IsNotEmpty, IsString, IsUUID, IsOptional, IsDateString, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateDateRange } from '../../validators/date-range.validator';

// Regex pattern for MM-YYYY format validation
const MM_YYYY_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;

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

  // New MM-YYYY period fields - optional in create
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

  // New MM-YYYY period fields for updates
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

// New DTO specifically for updating periods
export class UpdateForecastPeriodsDto {
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

  // New MM-YYYY period fields
  @IsOptional()
  @IsString()
  forecastStartMonth?: string;

  @IsOptional()
  @IsString()
  forecastEndMonth?: string;

  @IsOptional()
  @IsString()
  actualStartMonth?: string;

  @IsOptional()
  @IsString()
  actualEndMonth?: string;
} 