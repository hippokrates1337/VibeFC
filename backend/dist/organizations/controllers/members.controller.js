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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersController = void 0;
const common_1 = require("@nestjs/common");
const members_service_1 = require("../services/members.service");
const member_dto_1 = require("../dto/member.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../guards/roles.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
const member_dto_2 = require("../dto/member.dto");
let MembersController = class MembersController {
    constructor(membersService) {
        this.membersService = membersService;
    }
    async findAll(orgId) {
        return this.membersService.findAllInOrganization(orgId);
    }
    async addMember(orgId, inviteMemberDto) {
        return this.membersService.addMember(orgId, inviteMemberDto);
    }
    async updateRole(orgId, userId, updateRoleDto) {
        return this.membersService.updateMemberRole(orgId, userId, updateRoleDto);
    }
    async removeMember(orgId, userId) {
        return this.membersService.removeMember(orgId, userId);
    }
};
exports.MembersController = MembersController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(member_dto_2.OrganizationRole.ADMIN, member_dto_2.OrganizationRole.EDITOR, member_dto_2.OrganizationRole.VIEWER),
    __param(0, (0, common_1.Param)('orgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(member_dto_2.OrganizationRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, member_dto_1.InviteMemberDto]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "addMember", null);
__decorate([
    (0, common_1.Put)(':userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(member_dto_2.OrganizationRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, member_dto_1.UpdateMemberRoleDto]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(member_dto_2.OrganizationRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MembersController.prototype, "removeMember", null);
exports.MembersController = MembersController = __decorate([
    (0, common_1.Controller)('organizations/:orgId/members'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [members_service_1.MembersService])
], MembersController);
//# sourceMappingURL=members.controller.js.map