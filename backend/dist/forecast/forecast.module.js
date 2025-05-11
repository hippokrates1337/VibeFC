"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastModule = void 0;
const common_1 = require("@nestjs/common");
const forecast_controller_1 = require("./controllers/forecast.controller");
const forecast_service_1 = require("./services/forecast.service");
const forecast_node_service_1 = require("./services/forecast-node.service");
const forecast_edge_service_1 = require("./services/forecast-edge.service");
const supabase_module_1 = require("../supabase/supabase.module");
let ForecastModule = class ForecastModule {
};
exports.ForecastModule = ForecastModule;
exports.ForecastModule = ForecastModule = __decorate([
    (0, common_1.Module)({
        imports: [supabase_module_1.SupabaseModule],
        controllers: [forecast_controller_1.ForecastController],
        providers: [
            forecast_service_1.ForecastService,
            forecast_node_service_1.ForecastNodeService,
            forecast_edge_service_1.ForecastEdgeService
        ],
        exports: [
            forecast_service_1.ForecastService,
            forecast_node_service_1.ForecastNodeService,
            forecast_edge_service_1.ForecastEdgeService
        ],
    })
], ForecastModule);
//# sourceMappingURL=forecast.module.js.map