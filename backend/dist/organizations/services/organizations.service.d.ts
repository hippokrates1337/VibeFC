import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { OrganizationRole } from '../dto/member.dto';
import { MembersService } from './members.service';
import { Request } from 'express';
export declare class OrganizationsService {
    private supabaseService;
    private membersService;
    private readonly logger;
    constructor(supabaseService: SupabaseOptimizedService, membersService: MembersService);
    create(userId: string, dto: CreateOrganizationDto, request: Request): Promise<OrganizationDto>;
    findAll(userId: string, request: Request): Promise<OrganizationDto[]>;
    findOne(id: string, userId: string, request: Request): Promise<OrganizationDto>;
    update(id: string, dto: UpdateOrganizationDto, request: Request): Promise<void>;
    remove(id: string, request: Request): Promise<void>;
    getUserRoleInOrganization(userId: string, organizationId: string, request: Request): Promise<OrganizationRole | null>;
}
