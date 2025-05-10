import { IsNotEmpty, IsString, IsUUID, IsEmail, IsEnum } from 'class-validator';

export enum OrganizationRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export class InviteMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  
  @IsNotEmpty()
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
}

export class MemberDto {
  @IsUUID()
  organization_id: string;
  
  @IsUUID()
  user_id: string;
  
  @IsEnum(OrganizationRole)
  role: OrganizationRole;
  
  joined_at: Date;
} 