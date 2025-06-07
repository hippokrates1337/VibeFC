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
var ForecastCalculationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastCalculationController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const forecast_calculation_service_1 = require("../services/forecast-calculation.service");
let ForecastCalculationController = ForecastCalculationController_1 = class ForecastCalculationController {
    constructor(forecastCalculationService) {
        this.forecastCalculationService = forecastCalculationService;
        this.logger = new common_1.Logger(ForecastCalculationController_1.name);
    }
    async calculateForecast(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] Calculate forecast ${forecastId} requested by user ${req.user.id}`);
            const result = await this.forecastCalculationService.calculateForecast(forecastId, req.user.id);
            this.logger.log(`[ForecastCalculationController] Calculation completed for forecast ${forecastId}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] Calculation failed for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async getCalculationResults(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] Get calculation results for forecast ${forecastId} requested by user ${req.user.id}`);
            const result = await this.forecastCalculationService.getLatestCalculationResults(forecastId, req.user.id);
            if (result) {
                this.logger.log(`[ForecastCalculationController] Found calculation results for forecast ${forecastId}`);
            }
            else {
                this.logger.log(`[ForecastCalculationController] No calculation results found for forecast ${forecastId}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] Failed to get calculation results for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async getCalculationHistory(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] Get calculation history for forecast ${forecastId} requested by user ${req.user.id}`);
            const results = await this.forecastCalculationService.getCalculationHistory(forecastId, req.user.id);
            this.logger.log(`[ForecastCalculationController] Retrieved ${results.length} historical calculation results for forecast ${forecastId}`);
            return results;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] Failed to get calculation history for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async healthCheck() {
        this.logger.log(`[ForecastCalculationController] Health check requested`);
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.ForecastCalculationController = ForecastCalculationController;
__decorate([
    (0, common_1.Post)(':forecastId/calculate'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "calculateForecast", null);
__decorate([
    (0, common_1.Get)(':forecastId/calculation-results'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "getCalculationResults", null);
__decorate([
    (0, common_1.Get)(':forecastId/calculation-results/history'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "getCalculationHistory", null);
__decorate([
    (0, common_1.Get)('calculation/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "healthCheck", null);
exports.ForecastCalculationController = ForecastCalculationController = ForecastCalculationController_1 = __decorate([
    (0, common_1.Controller)('forecasts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [forecast_calculation_service_1.ForecastCalculationService])
], ForecastCalculationController);
//# sourceMappingURL=forecast-calculation.controller.js.map