import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { OrganizationRole } from '../dto/member.dto';
import { MembersService } from './members.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private membersService: MembersService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationDto> {
    let createdOrg: OrganizationDto | null = null;
    try {
      const { data: insertedOrg, error: insertError } = await this.supabaseService.client
        .from('organizations')
        .insert({
          name: dto.name,
          owner_id: userId,
        })
        .select('*')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          this.logger.warn(`Attempt to create organization with duplicate name: ${dto.name}`);
          throw new ConflictException('Organization with this name already exists');
        }
        this.logger.error(`Failed to insert organization: ${insertError.message}`, insertError.stack);
        throw new InternalServerErrorException(`Failed to create organization: ${insertError.message}`);
      }

      if (!insertedOrg) {
        this.logger.error('Organization insert succeeded but no data returned.');
        throw new InternalServerErrorException('Failed to create organization, data missing after insert.');
      }

      createdOrg = insertedOrg as OrganizationDto;
      this.logger.log(`Organization created: ${createdOrg.id} by user ${userId}`);

      try {
        await this.membersService.addMember(createdOrg.id, { email: userId, role: OrganizationRole.ADMIN });
        this.logger.log(`Added owner ${userId} as admin to organization ${createdOrg.id}`);
      } catch (memberError) {
        this.logger.error(`Failed to add owner ${userId} as admin member to org ${createdOrg.id}`, memberError.stack);
        throw new ConflictException(`Organization ${createdOrg.id} created, but failed to add owner as admin member. Please contact support.`);
      }

      return createdOrg;

    } catch (error) {
      if (error instanceof ConflictException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Unexpected error during organization creation: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred while creating the organization.');
    }
  }

  async findAll(userId: string): Promise<OrganizationDto[]> {
    const { data, error } = await this.supabaseService.client
      .from('organizations')
      .select(`
        *,
        organization_members!inner (
          user_id
        )
      `)
      .eq('organization_members.user_id', userId);

    if (error) {
      throw new InternalServerErrorException(`Failed to fetch organizations: ${error.message}`);
    }

    return data.map(org => ({
      id: org.id,
      name: org.name,
      owner_id: org.owner_id,
      created_at: new Date(org.created_at),
    }));
  }

  async findOne(id: string, userId: string): Promise<OrganizationDto> {
    // Note: The `!inner` join implies the user *must* be a member. 
    // If no record is found, it could be the org doesn't exist OR the user isn't a member.
    // The error handling needs to account for this ambiguity or the query needs changing
    // if we need to differentiate "Org not found" from "Access denied".
    const { data, error } = await this.supabaseService.client
      .from('organizations')
      .select(`
        *,
        organization_members!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('organization_members.user_id', userId)
      .single();

    if (error) {
      // Log the actual Supabase error
      this.logger.error(`Error fetching organization ${id} for user ${userId}: ${error.message}`, error.stack);
      // Treat DB errors as Internal Server Error, unless it's a specific known code we want to handle differently
      // For now, assume generic failure.
      throw new InternalServerErrorException(`Failed to retrieve organization details: ${error.message}`);
    }
    
    // If there was no error but data is null, it means the query returned no rows.
    // Given the !inner join, this means Org not found OR user not a member.
    if (!data) {
      this.logger.warn(`Organization ${id} not found or user ${userId} is not a member.`);
      // We throw NotFound, as the resource (accessible org) wasn't found for this user.
      throw new NotFoundException(`Organization with ID ${id} not found or user does not have access.`);
    }

    return {
      id: data.id,
      name: data.name,
      owner_id: data.owner_id,
      created_at: new Date(data.created_at),
    };
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('organizations')
      .update({ name: dto.name })
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to update organization ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to update organization ${id}: ${error.message}`);
    }

    if (!data) {
      this.logger.warn(`Attempted to update non-existent organization: ${id}`);
      throw new NotFoundException(`Organization with ID ${id} not found.`);
    }

    this.logger.log(`Organization updated: ${id}`);
  }

  async remove(id: string): Promise<void> {
    const { count, error } = await this.supabaseService.client
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete organization ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to delete organization ${id}: ${error.message}`);
    }
    
    if (count === 0) {
       this.logger.warn(`Attempted to delete non-existent organization: ${id}`);
      throw new NotFoundException(`Organization with ID ${id} not found.`);
    }

    this.logger.log(`Organization deleted: ${id}`);
  }

  async getUserRoleInOrganization(userId: string, organizationId: string): Promise<OrganizationRole | null> {
    const { data, error } = await this.supabaseService.client
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as OrganizationRole;
  }
} 