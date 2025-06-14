"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const data_intake_module_1 = require("./data-intake/data-intake.module");
const supabase_module_1 = require("./supabase/supabase.module");
const health_module_1 = require("./health/health.module");
const organizations_module_1 = require("./organizations/organizations.module");
const forecast_module_1 = require("./forecast/forecast.module");
const test_auth_module_1 = require("./test-auth/test-auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            supabase_module_1.SupabaseModule,
            data_intake_module_1.DataIntakeModule,
            health_module_1.HealthModule,
            organizations_module_1.OrganizationsModule,
            forecast_module_1.ForecastModule,
            test_auth_module_1.TestAuthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map