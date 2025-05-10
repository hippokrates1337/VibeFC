import { SupabaseService } from '../../supabase/supabase.service';
import { InviteMemberDto, UpdateMemberRoleDto } from '../dto/member.dto';
export declare class MembersService {
    private supabaseService;
    constructor(supabaseService: SupabaseService);
    findAllInOrganization(organizationId: string): Promise<any[]>;
    addMember(organizationId: string, dto: InviteMemberDto): Promise<void>;
    updateMemberRole(organizationId: string, userId: string, dto: UpdateMemberRoleDto): Promise<void>;
    removeMember(organizationId: string, userId: string): Promise<void>;
}
