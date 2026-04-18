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

/** Response from POST /organizations/:orgId/members (invite / add member). */
export interface AddMemberResponseDto {
  outcome: 'member_added' | 'invite_email_sent';
} 