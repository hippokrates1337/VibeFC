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
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const organizations_service_1 = require("../services/organizations.service");
let RolesGuard = class RolesGuard {
    constructor(reflector, organizationsService) {
        this.reflector = reflector;
        this.organizationsService = organizationsService;
    }
    async canActivate(context) {
        const requiredRoles = this.reflector.get('roles', context.getHandler());
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const { user } = request;
        const organizationId = request.params.orgId || request.body.organization_id;
        if (!user || !user.id) {
            throw new common_1.ForbiddenException('User is not authenticated');
        }
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization ID is required');
        }
        try {
            const userRole = await this.organizationsService.getUserRoleInOrganization(user.id, organizationId);
            if (!userRole) {
                return false;
            }
            return requiredRoles.includes(userRole);
        }
        catch (error) {
            throw new common_1.ForbiddenException(`Role check failed: ${error.message}`);
        }
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        organizations_service_1.OrganizationsService])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map