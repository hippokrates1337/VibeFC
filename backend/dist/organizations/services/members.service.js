"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_optimized_service_1 = require("../../supabase/supabase-optimized.service");
const member_dto_1 = require("../dto/member.dto");
let MembersService = class MembersService {
    constructor(supabaseService, configService) {
        this.supabaseService = supabaseService;
        this.configService = configService;
    }
    async findAllInOrganization(organizationId, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { data, error } = await client
            .from('organization_members_with_emails')
            .select('user_id, email, role, joined_at')
            .eq('organization_id', organizationId);
        if (error) {
            throw new common_1.InternalServerErrorException(`Failed to fetch members: ${error.message}`);
        }
        return (data || []).map((row) => ({
            id: row.user_id,
            email: row.email,
            role: row.role,
            joinedAt: new Date(row.joined_at),
        }));
    }
    async addMember(organizationId, dto, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const normalizedEmail = dto.email.trim().toLowerCase();
        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle();
        if (profileError) {
            throw new common_1.InternalServerErrorException(`Failed to look up user profile: ${profileError.message}`);
        }
        if (profile?.id) {
            await this.insertOrganizationMemberIfNeeded(client, organizationId, profile.id, dto.role);
            return { outcome: 'member_added' };
        }
        if (!this.supabaseService.hasServiceRoleKey()) {
            throw new common_1.UnprocessableEntityException('SUPABASE_SERVICE_ROLE_KEY is not configured; cannot send invitation emails for new users.');
        }
        const admin = this.supabaseService.getServiceRoleClient();
        const { error: invErr } = await client.from('organization_invitations').insert({
            organization_id: organizationId,
            email: normalizedEmail,
            role: dto.role,
        });
        if (invErr && invErr.code !== '23505') {
            throw new common_1.InternalServerErrorException(`Failed to record invitation: ${invErr.message}`);
        }
        const redirectTo = this.configService.get('SUPABASE_INVITE_REDIRECT_TO');
        const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
            data: {
                organization_id: organizationId,
                role: dto.role,
            },
            redirectTo: redirectTo || undefined,
        });
        if (inviteErr) {
            const code = inviteErr.code;
            const msg = inviteErr.message || '';
            const looksLikeAlreadyRegistered = code === 'email_exists' ||
                msg.toLowerCase().includes('already been registered') ||
                msg.toLowerCase().includes('already registered');
            if (looksLikeAlreadyRegistered) {
                const added = await this.tryAddExistingUserByEmail(admin, client, organizationId, normalizedEmail, dto.role);
                if (added) {
                    return { outcome: 'member_added' };
                }
            }
            throw new common_1.InternalServerErrorException(`Failed to send invitation email: ${msg}`);
        }
        return { outcome: 'invite_email_sent' };
    }
    async tryAddExistingUserByEmail(admin, userClient, organizationId, normalizedEmail, role) {
        const { data: profileRow } = await admin
            .from('profiles')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle();
        if (!profileRow?.id) {
            return false;
        }
        await this.insertOrganizationMemberIfNeeded(userClient, organizationId, profileRow.id, role);
        return true;
    }
    async insertOrganizationMemberIfNeeded(client, organizationId, userId, role) {
        const { data: existingMember, error: memberCheckError } = await client
            .from('organization_members')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .maybeSingle();
        if (memberCheckError) {
            throw new common_1.InternalServerErrorException(`Failed to check existing membership: ${memberCheckError.message}`);
        }
        if (existingMember) {
            throw new common_1.ConflictException(`User is already a member of this organization`);
        }
        const { error: insertError } = await client.from('organization_members').insert({
            organization_id: organizationId,
            user_id: userId,
            role,
        });
        if (insertError) {
            throw new common_1.InternalServerErrorException(`Failed to add member: ${insertError.message}`);
        }
    }
    async updateMemberRole(organizationId, userId, dto, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { data: existingMember, error: memberCheckError } = await client
            .from('organization_members')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .maybeSingle();
        if (memberCheckError) {
            throw new common_1.InternalServerErrorException(`Failed to check membership: ${memberCheckError.message}`);
        }
        if (!existingMember) {
            throw new common_1.NotFoundException(`User is not a member of this organization`);
        }
        if (existingMember.role === member_dto_1.OrganizationRole.ADMIN && dto.role !== member_dto_1.OrganizationRole.ADMIN) {
            const { data: adminCount, error: countError } = await client
                .from('organization_members')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .eq('role', member_dto_1.OrganizationRole.ADMIN);
            if (countError) {
                throw new common_1.InternalServerErrorException(`Failed to check admin count: ${countError.message}`);
            }
            if (adminCount.length <= 1) {
                throw new common_1.BadRequestException(`Cannot demote the last admin of the organization`);
            }
        }
        const { error: updateError } = await client
            .from('organization_members')
            .update({ role: dto.role })
            .eq('organization_id', organizationId)
            .eq('user_id', userId);
        if (updateError) {
            throw new common_1.InternalServerErrorException(`Failed to update member role: ${updateError.message}`);
        }
    }
    async removeMember(organizationId, userId, request) {
        const client = this.supabaseService.getClientForRequest(request);
        const { data: existingMember, error: memberCheckError } = await client
            .from('organization_members')
            .select('role')
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .maybeSingle();
        if (memberCheckError) {
            throw new common_1.InternalServerErrorException(`Failed to check membership: ${memberCheckError.message}`);
        }
        if (!existingMember) {
            throw new common_1.NotFoundException(`User is not a member of this organization`);
        }
        if (existingMember.role === member_dto_1.OrganizationRole.ADMIN) {
            const { data: adminCount, error: countError } = await client
                .from('organization_members')
                .select('id', { count: 'exact' })
                .eq('organization_id', organizationId)
                .eq('role', member_dto_1.OrganizationRole.ADMIN);
            if (countError) {
                throw new common_1.InternalServerErrorException(`Failed to check admin count: ${countError.message}`);
            }
            if (adminCount.length <= 1) {
                throw new common_1.BadRequestException(`Cannot remove the last admin of the organization`);
            }
        }
        const { error: deleteError } = await client
            .from('organization_members')
            .delete()
            .eq('organization_id', organizationId)
            .eq('user_id', userId);
        if (deleteError) {
            throw new common_1.InternalServerErrorException(`Failed to remove member: ${deleteError.message}`);
        }
    }
};
exports.MembersService = MembersService;
exports.MembersService = MembersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService,
        config_1.ConfigService])
], MembersService);
//# sourceMappingURL=members.service.js.map