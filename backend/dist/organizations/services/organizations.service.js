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
var OrganizationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../supabase/supabase.service");
const member_dto_1 = require("../dto/member.dto");
const members_service_1 = require("./members.service");
let OrganizationsService = OrganizationsService_1 = class OrganizationsService {
    constructor(supabaseService, membersService) {
        this.supabaseService = supabaseService;
        this.membersService = membersService;
        this.logger = new common_1.Logger(OrganizationsService_1.name);
    }
    async create(userId, dto) {
        let createdOrg = null;
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
                    throw new common_1.ConflictException('Organization with this name already exists');
                }
                this.logger.error(`Failed to insert organization: ${insertError.message}`, insertError.stack);
                throw new common_1.InternalServerErrorException(`Failed to create organization: ${insertError.message}`);
            }
            if (!insertedOrg) {
                this.logger.error('Organization insert succeeded but no data returned.');
                throw new common_1.InternalServerErrorException('Failed to create organization, data missing after insert.');
            }
            createdOrg = insertedOrg;
            this.logger.log(`Organization created: ${createdOrg.id} by user ${userId}`);
            try {
                await this.membersService.addMember(createdOrg.id, { email: userId, role: member_dto_1.OrganizationRole.ADMIN });
                this.logger.log(`Added owner ${userId} as admin to organization ${createdOrg.id}`);
            }
            catch (memberError) {
                this.logger.error(`Failed to add owner ${userId} as admin member to org ${createdOrg.id}`, memberError.stack);
                throw new common_1.ConflictException(`Organization ${createdOrg.id} created, but failed to add owner as admin member. Please contact support.`);
            }
            return createdOrg;
        }
        catch (error) {
            if (error instanceof common_1.ConflictException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`Unexpected error during organization creation: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException('An unexpected error occurred while creating the organization.');
        }
    }
    async findAll(userId) {
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
            throw new common_1.InternalServerErrorException(`Failed to fetch organizations: ${error.message}`);
        }
        return data.map(org => ({
            id: org.id,
            name: org.name,
            owner_id: org.owner_id,
            created_at: new Date(org.created_at),
        }));
    }
    async findOne(id, userId) {
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
            this.logger.error(`Error fetching organization ${id} for user ${userId}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to retrieve organization details: ${error.message}`);
        }
        if (!data) {
            this.logger.warn(`Organization ${id} not found or user ${userId} is not a member.`);
            throw new common_1.NotFoundException(`Organization with ID ${id} not found or user does not have access.`);
        }
        return {
            id: data.id,
            name: data.name,
            owner_id: data.owner_id,
            created_at: new Date(data.created_at),
        };
    }
    async update(id, dto) {
        const { data, error } = await this.supabaseService.client
            .from('organizations')
            .update({ name: dto.name })
            .eq('id', id)
            .select('id')
            .single();
        if (error) {
            this.logger.error(`Failed to update organization ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to update organization ${id}: ${error.message}`);
        }
        if (!data) {
            this.logger.warn(`Attempted to update non-existent organization: ${id}`);
            throw new common_1.NotFoundException(`Organization with ID ${id} not found.`);
        }
        this.logger.log(`Organization updated: ${id}`);
    }
    async remove(id) {
        const { count, error } = await this.supabaseService.client
            .from('organizations')
            .delete()
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to delete organization ${id}: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Failed to delete organization ${id}: ${error.message}`);
        }
        if (count === 0) {
            this.logger.warn(`Attempted to delete non-existent organization: ${id}`);
            throw new common_1.NotFoundException(`Organization with ID ${id} not found.`);
        }
        this.logger.log(`Organization deleted: ${id}`);
    }
    async getUserRoleInOrganization(userId, organizationId) {
        const { data, error } = await this.supabaseService.client
            .from('organization_members')
            .select('role')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .single();
        if (error || !data) {
            return null;
        }
        return data.role;
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = OrganizationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        members_service_1.MembersService])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map