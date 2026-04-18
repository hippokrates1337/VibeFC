import { ConfigService } from '@nestjs/config';
import { SupabaseOptimizedService } from '../../supabase/supabase-optimized.service';
import { InviteMemberDto, UpdateMemberRoleDto, AddMemberResponseDto } from '../dto/member.dto';
import { Request } from 'express';
export declare class MembersService {
    private readonly supabaseService;
    private readonly configService;
    constructor(supabaseService: SupabaseOptimizedService, configService: ConfigService);
    findAllInOrganization(organizationId: string, request: Request): Promise<any[]>;
    addMember(organizationId: string, dto: InviteMemberDto, request: Request): Promise<AddMemberResponseDto>;
    private tryAddExistingUserByEmail;
    private insertOrganizationMemberIfNeeded;
    updateMemberRole(organizationId: string, userId: string, dto: UpdateMemberRoleDto, request: Request): Promise<void>;
    removeMember(organizationId: string, userId: string, request: Request): Promise<void>;
}
