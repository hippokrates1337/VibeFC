import { MembersService } from '../services/members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from '../dto/member.dto';
export declare class MembersController {
    private readonly membersService;
    constructor(membersService: MembersService);
    findAll(orgId: string): Promise<any[]>;
    addMember(orgId: string, inviteMemberDto: InviteMemberDto): Promise<void>;
    updateRole(orgId: string, userId: string, updateRoleDto: UpdateMemberRoleDto): Promise<void>;
    removeMember(orgId: string, userId: string): Promise<void>;
}
