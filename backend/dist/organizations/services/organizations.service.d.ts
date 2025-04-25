import { SupabaseService } from '../../supabase/supabase.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { OrganizationRole } from '../dto/member.dto';
import { MembersService } from './members.service';
export declare class OrganizationsService {
    private supabaseService;
    private membersService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, membersService: MembersService);
    create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationDto>;
    findAll(userId: string): Promise<OrganizationDto[]>;
    findOne(id: string, userId: string): Promise<OrganizationDto>;
    update(id: string, dto: UpdateOrganizationDto): Promise<void>;
    remove(id: string): Promise<void>;
    getUserRoleInOrganization(userId: string, organizationId: string): Promise<OrganizationRole | null>;
}
