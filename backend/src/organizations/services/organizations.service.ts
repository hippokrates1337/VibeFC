import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { OrganizationRole } from '../dto/member.dto';
import { toHttpException, type DatabaseError } from '../../common/errors/database-error';
import { Request } from 'express';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private supabaseService: SupabaseOptimizedService) {}

  private dbError(error: DatabaseError, action: string) {
    return toHttpException(error, { action, subject: 'Organization', logger: this.logger });
  }

  /** The creator becomes admin through the database trigger on organizations. */
  async create(userId: string, dto: CreateOrganizationDto, request: Request): Promise<OrganizationDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organizations')
      .insert({ name: dto.name, owner_id: userId })
      .select('*')
      .single();

    if (error) {
      throw this.dbError(error, 'create an organization');
    }
    if (!data) {
      throw new InternalServerErrorException('Failed to create the organization');
    }
    this.logger.log(`Organization created: ${data.id} by user ${userId}`);
    return this.toDto(data);
  }

  async findAll(userId: string, request: Request): Promise<OrganizationDto[]> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organizations')
      .select('*, organization_members!inner (user_id)')
      .eq('organization_members.user_id', userId);

    if (error) {
      throw this.dbError(error, 'load the organizations');
    }
    return data.map((org) => this.toDto(org));
  }

  /** The organization if the caller is a member; 404 otherwise. */
  async findOne(id: string, userId: string, request: Request): Promise<OrganizationDto> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organizations')
      .select('*, organization_members!inner (user_id)')
      .eq('id', id)
      .eq('organization_members.user_id', userId)
      .maybeSingle();

    if (error) {
      throw this.dbError(error, 'load the organization');
    }
    if (!data) {
      throw new NotFoundException('Organization not found');
    }
    return this.toDto(data);
  }

  async update(id: string, dto: UpdateOrganizationDto, request: Request): Promise<void> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organizations')
      .update({ name: dto.name })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw this.dbError(error, 'rename this organization');
    }
    if (!data) {
      throw new NotFoundException('Organization not found');
    }
    this.logger.log(`Organization updated: ${id}`);
  }

  /** Deletes the organization; its members, forecasts and variables go with it (ON DELETE CASCADE). */
  async remove(id: string, request: Request): Promise<void> {
    const client = this.supabaseService.getClientForRequest(request);
    const { count, error } = await client.from('organizations').delete({ count: 'exact' }).eq('id', id);

    if (error) {
      throw this.dbError(error, 'delete this organization');
    }
    // The route is admin-only (RolesGuard), so no deleted row means row-level security refused it
    if (count === 0) {
      throw new ForbiddenException('You do not have permission to delete this organization');
    }
    this.logger.log(`Organization deleted: ${id}`);
  }

  async getUserRoleInOrganization(userId: string, organizationId: string, request: Request): Promise<OrganizationRole | null> {
    const client = this.supabaseService.getClientForRequest(request);
    const { data, error } = await client
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data.role as OrganizationRole;
  }

  private toDto(row: any): OrganizationDto {
    return {
      id: row.id,
      name: row.name,
      owner_id: row.owner_id,
      created_at: new Date(row.created_at),
    };
  }
}
