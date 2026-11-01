import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
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
import { toHttpException, type DatabaseError } from '../../common/errors/database-error';
import { Request } from 'express';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly supabaseService: SupabaseOptimizedService,
    private readonly configService: ConfigService,
  ) {}

  private dbError(error: DatabaseError, action: string) {
    return toHttpException(error, { action, subject: 'Member', logger: this.logger });
  }

  async findAllInOrganization(organizationId: string, request: Request): Promise<any[]> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organization_members_with_emails')
      .select('user_id, email, role, joined_at')
      .eq('organization_id', organizationId);

    if (error) {
      throw this.dbError(error, 'fetch members');
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
    this.logger.log(`Attempting member add: org=${organizationId} email=${dto.email.trim().toLowerCase()} role=${dto.role}`);
    const client = this.supabaseService.getClientForRequest(request);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      throw this.dbError(profileError, 'look up user profile');
    }

    if (profile?.id) {
      await this.insertOrganizationMemberIfNeeded(client, organizationId, profile.id as string, dto.role);
      this.logger.log(`Member add completed via existing profile: org=${organizationId} user=${profile.id}`);
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
      throw this.dbError(invErr, 'record invitation');
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

      this.logger.error(`Invitation email failed: ${msg}`);
      throw new InternalServerErrorException('Failed to send the invitation email');
    }

    this.logger.log(`Invitation email queued: org=${organizationId} email=${normalizedEmail} role=${dto.role}`);
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
      throw this.dbError(memberCheckError, 'check existing membership');
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
      throw this.dbError(insertError, 'add member');
    }
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    request: Request,
  ): Promise<void> {
    this.logger.log(`Updating member role: org=${organizationId} user=${userId} role=${dto.role}`);
    const client = this.supabaseService.getClientForRequest(request);

    const { data: existingMember, error: memberCheckError } = await client
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw this.dbError(memberCheckError, 'check membership');
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
        throw this.dbError(countError, 'check admin count');
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
      throw this.dbError(updateError, 'update member role');
    }

    this.logger.log(`Member role updated: org=${organizationId} user=${userId} role=${dto.role}`);
  }

  async removeMember(organizationId: string, userId: string, request: Request): Promise<void> {
    this.logger.log(`Removing member: org=${organizationId} user=${userId}`);
    const client = this.supabaseService.getClientForRequest(request);

    const { data: existingMember, error: memberCheckError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw this.dbError(memberCheckError, 'check membership');
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
        throw this.dbError(countError, 'check admin count');
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
      throw this.dbError(deleteError, 'remove member');
    }

    this.logger.log(`Member removed: org=${organizationId} user=${userId}`);
  }
}
