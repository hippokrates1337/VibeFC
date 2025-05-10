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
const supabase_service_1 = require("../../supabase/supabase.service");
const member_dto_1 = require("../dto/member.dto");
let MembersService = class MembersService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async findAllInOrganization(organizationId) {
        const { data, error } = await this.supabaseService.client
            .from('organization_members')
            .select(`
        *,
        user:user_id (
          id,
          email
        )
      `)
            .eq('organization_id', organizationId);
        if (error) {
            throw new common_1.InternalServerErrorException(`Failed to fetch members: ${error.message}`);
        }
        return data.map(member => ({
            id: member.user.id,
            email: member.user.email,
            role: member.role,
            joinedAt: new Date(member.joined_at),
        }));
    }
    async addMember(organizationId, dto) {
        const { data: userData, error: userError } = await this.supabaseService.client
            .from('auth.users')
            .select('id')
            .eq('email', dto.email)
            .single();
        if (userError) {
            throw new common_1.NotFoundException(`User with email ${dto.email} not found`);
        }
        const userId = userData.id;
        const { data: existingMember, error: memberCheckError } = await this.supabaseService.client
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
        const { error: insertError } = await this.supabaseService.client
            .from('organization_members')
            .insert({
            organization_id: organizationId,
            user_id: userId,
            role: dto.role,
        });
        if (insertError) {
            throw new common_1.InternalServerErrorException(`Failed to add member: ${insertError.message}`);
        }
    }
    async updateMemberRole(organizationId, userId, dto) {
        const { data: existingMember, error: memberCheckError } = await this.supabaseService.client
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
            const { data: adminCount, error: countError } = await this.supabaseService.client
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
        const { error: updateError } = await this.supabaseService.client
            .from('organization_members')
            .update({ role: dto.role })
            .eq('organization_id', organizationId)
            .eq('user_id', userId);
        if (updateError) {
            throw new common_1.InternalServerErrorException(`Failed to update member role: ${updateError.message}`);
        }
    }
    async removeMember(organizationId, userId) {
        const { data: existingMember, error: memberCheckError } = await this.supabaseService.client
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
            const { data: adminCount, error: countError } = await this.supabaseService.client
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
        const { error: deleteError } = await this.supabaseService.client
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
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], MembersService);
//# sourceMappingURL=members.service.js.map