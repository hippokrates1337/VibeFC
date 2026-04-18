import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import {
  InviteMemberDto,
  UpdateMemberRoleDto,
  OrganizationRole,
  AddMemberResponseDto,
} from '../dto/member.dto';
import { Request } from 'express';

@Injectable()
export class MembersService {
  constructor(
    private readonly supabaseService: SupabaseOptimizedService,
    private readonly configService: ConfigService,
  ) {}

  async findAllInOrganization(organizationId: string, request: Request): Promise<any[]> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organization_members_with_emails')
      .select('user_id, email, role, joined_at')
      .eq('organization_id', organizationId);

    if (error) {
      throw new InternalServerErrorException(`Failed to fetch members: ${error.message}`);
    }

    return (data || []).map((row: { user_id: string; email: string | null; role: string; joined_at: string }) => ({
      id: row.user_id,
      email: row.email,
      role: row.role,
      joinedAt: new Date(row.joined_at),
    }));
  }

  async addMember(
    organizationId: string,
    dto: InviteMemberDto,
    request: Request,
  ): Promise<AddMemberResponseDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      throw new InternalServerErrorException(`Failed to look up user profile: ${profileError.message}`);
    }

    if (profile?.id) {
      await this.insertOrganizationMemberIfNeeded(client, organizationId, profile.id as string, dto.role);
      return { outcome: 'member_added' };
    }

    if (!this.supabaseService.hasServiceRoleKey()) {
      throw new UnprocessableEntityException(
        'SUPABASE_SERVICE_ROLE_KEY is not configured; cannot send invitation emails for new users.',
      );
    }

    const admin = this.supabaseService.getServiceRoleClient();

    const { error: invErr } = await client.from('organization_invitations').insert({
      organization_id: organizationId,
      email: normalizedEmail,
      role: dto.role,
    });

    if (invErr && invErr.code !== '23505') {
      throw new InternalServerErrorException(`Failed to record invitation: ${invErr.message}`);
    }

    const redirectTo = this.configService.get<string>('SUPABASE_INVITE_REDIRECT_TO');

    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        organization_id: organizationId,
        role: dto.role,
      },
      redirectTo: redirectTo || undefined,
    });

    if (inviteErr) {
      const code = (inviteErr as { code?: string }).code;
      const msg = inviteErr.message || '';
      const looksLikeAlreadyRegistered =
        code === 'email_exists' ||
        msg.toLowerCase().includes('already been registered') ||
        msg.toLowerCase().includes('already registered');

      if (looksLikeAlreadyRegistered) {
        const added = await this.tryAddExistingUserByEmail(
          admin,
          client,
          organizationId,
          normalizedEmail,
          dto.role,
        );
        if (added) {
          return { outcome: 'member_added' };
        }
      }

      throw new InternalServerErrorException(`Failed to send invitation email: ${msg}`);
    }

    return { outcome: 'invite_email_sent' };
  }

  private async tryAddExistingUserByEmail(
    admin: SupabaseClient,
    userClient: SupabaseClient,
    organizationId: string,
    normalizedEmail: string,
    role: OrganizationRole,
  ): Promise<boolean> {
    const { data: profileRow } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!profileRow?.id) {
      return false;
    }

    await this.insertOrganizationMemberIfNeeded(userClient, organizationId, profileRow.id as string, role);
    return true;
  }

  private async insertOrganizationMemberIfNeeded(
    client: SupabaseClient,
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): Promise<void> {
    const { data: existingMember, error: memberCheckError } = await client
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw new InternalServerErrorException(
        `Failed to check existing membership: ${memberCheckError.message}`,
      );
    }

    if (existingMember) {
      throw new ConflictException(`User is already a member of this organization`);
    }

    const { error: insertError } = await client.from('organization_members').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
    });

    if (insertError) {
      throw new InternalServerErrorException(`Failed to add member: ${insertError.message}`);
    }
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    request: Request,
  ): Promise<void> {
    const client = this.supabaseService.getClientForRequest(request);

    const { data: existingMember, error: memberCheckError } = await client
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw new InternalServerErrorException(`Failed to check membership: ${memberCheckError.message}`);
    }

    if (!existingMember) {
      throw new NotFoundException(`User is not a member of this organization`);
    }

    if (existingMember.role === OrganizationRole.ADMIN && dto.role !== OrganizationRole.ADMIN) {
      const { data: adminCount, error: countError } = await client
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('role', OrganizationRole.ADMIN);

      if (countError) {
        throw new InternalServerErrorException(`Failed to check admin count: ${countError.message}`);
      }

      if (adminCount.length <= 1) {
        throw new BadRequestException(`Cannot demote the last admin of the organization`);
      }
    }

    const { error: updateError } = await client
      .from('organization_members')
      .update({ role: dto.role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (updateError) {
      throw new InternalServerErrorException(`Failed to update member role: ${updateError.message}`);
    }
  }

  async removeMember(organizationId: string, userId: string, request: Request): Promise<void> {
    const client = this.supabaseService.getClientForRequest(request);

    const { data: existingMember, error: memberCheckError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw new InternalServerErrorException(`Failed to check membership: ${memberCheckError.message}`);
    }

    if (!existingMember) {
      throw new NotFoundException(`User is not a member of this organization`);
    }

    if (existingMember.role === OrganizationRole.ADMIN) {
      const { data: adminCount, error: countError } = await client
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('role', OrganizationRole.ADMIN);

      if (countError) {
        throw new InternalServerErrorException(`Failed to check admin count: ${countError.message}`);
      }

      if (adminCount.length <= 1) {
        throw new BadRequestException(`Cannot remove the last admin of the organization`);
      }
    }

    const { error: deleteError } = await client
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new InternalServerErrorException(`Failed to remove member: ${deleteError.message}`);
    }
  }
}
