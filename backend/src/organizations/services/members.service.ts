import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { InviteMemberDto, UpdateMemberRoleDto, MemberDto, OrganizationRole } from '../dto/member.dto';

@Injectable()
export class MembersService {
  constructor(private supabaseService: SupabaseService) {}

  async findAllInOrganization(organizationId: string): Promise<any[]> {
    const { data, error } = await this.supabaseService.client
      .from('organization_members')
      .select(`
        *,
        user:user_id (
          id,
          email
        )
      `)
      .eq('organization_id', organizationId);

    if (error) {
      throw new InternalServerErrorException(`Failed to fetch members: ${error.message}`);
    }

    return data.map(member => ({
      id: member.user.id,
      email: member.user.email,
      role: member.role,
      joinedAt: new Date(member.joined_at),
    }));
  }

  async addMember(organizationId: string, dto: InviteMemberDto): Promise<void> {
    // First, check if the user exists
    const { data: userData, error: userError } = await this.supabaseService.client
      .from('auth.users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (userError) {
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }

    const userId = userData.id;

    // Check if the user is already a member
    const { data: existingMember, error: memberCheckError } = await this.supabaseService.client
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw new InternalServerErrorException(`Failed to check existing membership: ${memberCheckError.message}`);
    }

    if (existingMember) {
      throw new ConflictException(`User is already a member of this organization`);
    }

    // Add the user as a member
    const { error: insertError } = await this.supabaseService.client
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: dto.role,
      });

    if (insertError) {
      throw new InternalServerErrorException(`Failed to add member: ${insertError.message}`);
    }
  }

  async updateMemberRole(organizationId: string, userId: string, dto: UpdateMemberRoleDto): Promise<void> {
    // Check if the member exists
    const { data: existingMember, error: memberCheckError } = await this.supabaseService.client
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

    // Check if this is the last admin
    if (existingMember.role === OrganizationRole.ADMIN && dto.role !== OrganizationRole.ADMIN) {
      const { data: adminCount, error: countError } = await this.supabaseService.client
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

    // Update the member's role
    const { error: updateError } = await this.supabaseService.client
      .from('organization_members')
      .update({ role: dto.role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (updateError) {
      throw new InternalServerErrorException(`Failed to update member role: ${updateError.message}`);
    }
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    // Check if the member exists and is not the last admin
    const { data: existingMember, error: memberCheckError } = await this.supabaseService.client
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

    // If the member is an admin, check if they are the last admin
    if (existingMember.role === OrganizationRole.ADMIN) {
      const { data: adminCount, error: countError } = await this.supabaseService.client
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

    // Remove the member
    const { error: deleteError } = await this.supabaseService.client
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new InternalServerErrorException(`Failed to remove member: ${deleteError.message}`);
    }
  }
}