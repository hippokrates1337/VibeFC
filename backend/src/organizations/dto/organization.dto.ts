import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

export class OrganizationDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsUUID()
  owner_id: string;

  created_at: Date;
} 