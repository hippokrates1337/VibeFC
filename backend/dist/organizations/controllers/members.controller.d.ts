import { MembersService } from '../services/members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from '../dto/member.dto';
import { Request } from 'express';
interface RequestWithUser extends Request {
    user: {
        id: string;
        [key: string]: any;
    };
}
export declare class MembersController {
    private readonly membersService;
    constructor(membersService: MembersService);
    findAll(orgId: string, req: RequestWithUser): Promise<any[]>;
    addMember(orgId: string, inviteMemberDto: InviteMemberDto, req: RequestWithUser): Promise<void>;
    updateRole(orgId: string, userId: string, updateRoleDto: UpdateMemberRoleDto, req: RequestWithUser): Promise<void>;
    removeMember(orgId: string, userId: string, req: RequestWithUser): Promise<void>;
}
export {};
