import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { InviteMemberDto, UpdateMemberRoleDto } from '../dto/member.dto';
import { Request } from 'express';
export declare class MembersService {
    private supabaseService;
    constructor(supabaseService: SupabaseOptimizedService);
    findAllInOrganization(organizationId: string, request: Request): Promise<any[]>;
    addMember(organizationId: string, dto: InviteMemberDto, request: Request): Promise<void>;
    updateMemberRole(organizationId: string, userId: string, dto: UpdateMemberRoleDto, request: Request): Promise<void>;
    removeMember(organizationId: string, userId: string, request: Request): Promise<void>;
}
