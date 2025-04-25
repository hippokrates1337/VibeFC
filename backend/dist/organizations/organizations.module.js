"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsModule = void 0;
const common_1 = require("@nestjs/common");
const organizations_controller_1 = require("./controllers/organizations.controller");
const organizations_service_1 = require("./services/organizations.service");
const members_controller_1 = require("./controllers/members.controller");
const members_service_1 = require("./services/members.service");
const supabase_module_1 = require("../supabase/supabase.module");
let OrganizationsModule = class OrganizationsModule {
};
exports.OrganizationsModule = OrganizationsModule;
exports.OrganizationsModule = OrganizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [supabase_module_1.SupabaseModule],
        controllers: [organizations_controller_1.OrganizationsController, members_controller_1.MembersController],
        providers: [organizations_service_1.OrganizationsService, members_service_1.MembersService],
        exports: [organizations_service_1.OrganizationsService, members_service_1.MembersService],
    })
], OrganizationsModule);
//# sourceMappingURL=organizations.module.js.map