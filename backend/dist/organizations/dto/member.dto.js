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
exports.MemberDto = exports.UpdateMemberRoleDto = exports.InviteMemberDto = exports.OrganizationRole = void 0;
const class_validator_1 = require("class-validator");
var OrganizationRole;
(function (OrganizationRole) {
    OrganizationRole["ADMIN"] = "admin";
    OrganizationRole["EDITOR"] = "editor";
    OrganizationRole["VIEWER"] = "viewer";
})(OrganizationRole || (exports.OrganizationRole = OrganizationRole = {}));
class InviteMemberDto {
}
exports.InviteMemberDto = InviteMemberDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], InviteMemberDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(OrganizationRole),
    __metadata("design:type", String)
], InviteMemberDto.prototype, "role", void 0);
class UpdateMemberRoleDto {
}
exports.UpdateMemberRoleDto = UpdateMemberRoleDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(OrganizationRole),
    __metadata("design:type", String)
], UpdateMemberRoleDto.prototype, "role", void 0);
class MemberDto {
}
exports.MemberDto = MemberDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MemberDto.prototype, "organization_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MemberDto.prototype, "user_id", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(OrganizationRole),
    __metadata("design:type", String)
], MemberDto.prototype, "role", void 0);
//# sourceMappingURL=member.dto.js.map