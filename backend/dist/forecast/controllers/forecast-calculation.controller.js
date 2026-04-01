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
const debug_calculation_service_1 = require("../services/debug-calculation.service");
const calculation_dto_1 = require("../dto/calculation.dto");
const debug_calculation_dto_1 = require("../dto/debug-calculation.dto");
let ForecastCalculationController = ForecastCalculationController_1 = class ForecastCalculationController {
    constructor(forecastCalculationService, debugCalculationService) {
        this.forecastCalculationService = forecastCalculationService;
        this.debugCalculationService = debugCalculationService;
        this.logger = new common_1.Logger(ForecastCalculationController_1.name);
    }
    async calculateUnified(forecastId, body, req) {
        try {
            this.logger.log(`[ForecastCalculationController] [Unified] Calculate unified for forecast ${forecastId} requested by user ${req.user.id}`);
            this.logger.log(`[ForecastCalculationController] [Unified] Calculation types: [${body.calculationTypes.join(', ')}]`);
            this.logger.log(`[ForecastCalculationController] [Unified] Include intermediate nodes: ${body.includeIntermediateNodes}`);
            const result = await this.forecastCalculationService.calculateForecastWithPeriods(forecastId, req.user.id, req, body);
            this.logger.log(`[ForecastCalculationController] [Unified] Unified calculation completed for forecast ${forecastId}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] [Unified] Unified calculation failed for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async getUnifiedCalculationResults(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] [Unified] Get unified calculation results for forecast ${forecastId} requested by user ${req.user.id}`);
            const result = await this.forecastCalculationService.getLatestUnifiedCalculationResults(forecastId, req.user.id, req);
            if (result) {
                this.logger.log(`[ForecastCalculationController] [Unified] Found unified calculation results for forecast ${forecastId}`);
            }
            else {
                this.logger.log(`[ForecastCalculationController] [Unified] No unified calculation results found for forecast ${forecastId}`);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] [Unified] Failed to get unified calculation results for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async getCalculationHistory(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] Get calculation history for forecast ${forecastId} requested by user ${req.user.id}`);
            const results = await this.forecastCalculationService.getCalculationHistory(forecastId, req.user.id, req);
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
    async calculateWithDebug(forecastId, body, req) {
        try {
            this.logger.log(`[ForecastCalculationController] [Debug] Debug calculation for forecast ${forecastId} requested by user ${req.user.id}`);
            this.logger.log(`[ForecastCalculationController] [Debug] Debug level: ${body.debugLevel || 'basic'}`);
            this.logger.log(`[ForecastCalculationController] [Debug] Calculation types: [${body.calculationTypes.join(', ')}]`);
            this.logger.log(`[ForecastCalculationController] [Debug] Include intermediate nodes: ${body.includeIntermediateNodes}`);
            this.logger.log(`[ForecastCalculationController] [Debug] Focus node IDs: ${body.focusNodeIds?.length || 0} nodes`);
            const result = await this.debugCalculationService.calculateWithDebug(forecastId, req.user.id, req, body);
            this.logger.log(`[ForecastCalculationController] [Debug] Debug calculation completed for forecast ${forecastId}`);
            this.logger.log(`[ForecastCalculationController] [Debug] Captured ${result.debugInfo.calculationSteps.length} calculation steps`);
            this.logger.log(`[ForecastCalculationController] [Debug] Total execution time: ${result.debugInfo.performanceMetrics.totalExecutionTimeMs}ms`);
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] [Debug] Debug calculation failed for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async getCalculationTree(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] [Debug] Get calculation tree for forecast ${forecastId} requested by user ${req.user.id}`);
            const result = await this.debugCalculationService.getCalculationTree(forecastId, req.user.id, req);
            this.logger.log(`[ForecastCalculationController] [Debug] Calculation tree retrieved for forecast ${forecastId}`);
            this.logger.log(`[ForecastCalculationController] [Debug] Tree contains ${result.totalNodes} nodes across ${result.trees.length} metric trees`);
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] [Debug] Failed to get calculation tree for forecast ${forecastId}:`, error);
            throw error;
        }
    }
    async getCalculationSteps(forecastId, req) {
        try {
            this.logger.log(`[ForecastCalculationController] [Debug] Get calculation steps for forecast ${forecastId} requested by user ${req.user.id}`);
            const result = await this.debugCalculationService.getCalculationSteps(forecastId);
            this.logger.log(`[ForecastCalculationController] [Debug] Retrieved ${result.length} calculation steps for forecast ${forecastId}`);
            return result;
        }
        catch (error) {
            this.logger.error(`[ForecastCalculationController] [Debug] Failed to get calculation steps for forecast ${forecastId}:`, error);
            throw error;
        }
    }
};
exports.ForecastCalculationController = ForecastCalculationController;
__decorate([
    (0, common_1.Post)(':forecastId/calculate-unified'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, calculation_dto_1.UnifiedCalculationRequestDto, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "calculateUnified", null);
__decorate([
    (0, common_1.Get)(':forecastId/calculation-results-unified'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "getUnifiedCalculationResults", null);
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
__decorate([
    (0, common_1.Post)(':forecastId/calculate-debug'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, debug_calculation_dto_1.DebugCalculationRequestDto, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "calculateWithDebug", null);
__decorate([
    (0, common_1.Get)(':forecastId/debug/calculation-tree'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "getCalculationTree", null);
__decorate([
    (0, common_1.Get)(':forecastId/debug/calculation-steps'),
    __param(0, (0, common_1.Param)('forecastId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForecastCalculationController.prototype, "getCalculationSteps", null);
exports.ForecastCalculationController = ForecastCalculationController = ForecastCalculationController_1 = __decorate([
    (0, common_1.Controller)('forecasts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [forecast_calculation_service_1.ForecastCalculationService,
        debug_calculation_service_1.DebugCalculationService])
], ForecastCalculationController);
//# sourceMappingURL=forecast-calculation.controller.js.map