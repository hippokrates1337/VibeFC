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
var ForecastController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastController = void 0;
const common_1 = require("@nestjs/common");
const forecast_service_1 = require("../services/forecast.service");
const forecast_node_service_1 = require("../services/forecast-node.service");
const forecast_edge_service_1 = require("../services/forecast-edge.service");
const forecast_dto_1 = require("../dto/forecast.dto");
const forecast_node_dto_1 = require("../dto/forecast-node.dto");
const forecast_edge_dto_1 = require("../dto/forecast-edge.dto");
const bulk_save_graph_dto_1 = require("../dto/bulk-save-graph.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let ForecastController = ForecastController_1 = class ForecastController {
    constructor(forecastService, nodeService, edgeService) {
        this.forecastService = forecastService;
        this.nodeService = nodeService;
        this.edgeService = edgeService;
        this.logger = new common_1.Logger(ForecastController_1.name);
    }
    async create(req, createForecastDto) {
        this.logger.debug(`ForecastController.create called`);
        this.logger.debug(`Request user object: ${JSON.stringify(req.user)}`);
        const userId = req.user?.userId;
        if (!userId) {
            this.logger.error('User ID not found in request after auth guard. Check JWT strategy and guard setup.');
        }
        this.logger.debug(`Extracted userId: ${userId}`);
        this.logger.debug(`Received CreateForecastDto: ${JSON.stringify(createForecastDto)}`);
        try {
            const result = await this.forecastService.create(userId, createForecastDto, req);
            this.logger.debug(`Forecast creation successful in controller, returning result.`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error in ForecastController.create while calling service: ${error.message}`, error.stack);
            throw error;
        }
    }
    async findAll(req, organizationId) {
        const userId = req.user.userId;
        return this.forecastService.findAll(userId, organizationId, req);
    }
    async findOne(req, id) {
        const userId = req.user.userId;
        return this.forecastService.findOne(id, userId, req);
    }
    async update(req, id, updateForecastDto) {
        const userId = req.user.userId;
        return this.forecastService.update(id, userId, updateForecastDto, req);
    }
    async remove(req, id) {
        const userId = req.user.userId;
        return this.forecastService.remove(id, userId, req);
    }
    async bulkSaveGraph(req, forecastId, bulkSaveDto) {
        const userId = req.user.userId;
        this.logger.log(`Bulk save graph request for forecast ${forecastId} by user ${userId}`);
        return this.forecastService.bulkSaveGraph(forecastId, userId, bulkSaveDto, req);
    }
    async createNode(req, forecastId, createNodeDto) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        createNodeDto.forecastId = forecastId;
        return this.nodeService.create(createNodeDto, req);
    }
    async findNodes(req, forecastId) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.nodeService.findByForecast(forecastId, req);
    }
    async findNode(req, forecastId, nodeId) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.nodeService.findOne(nodeId, req);
    }
    async updateNode(req, forecastId, nodeId, updateNodeDto) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.nodeService.update(nodeId, updateNodeDto, req);
    }
    async removeNode(req, forecastId, nodeId) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.nodeService.remove(nodeId, req);
    }
    async createEdge(req, forecastId, createEdgeDto) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        createEdgeDto.forecastId = forecastId;
        return this.edgeService.create(createEdgeDto, req);
    }
    async findEdges(req, forecastId) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.edgeService.findByForecast(forecastId, req);
    }
    async findEdge(req, forecastId, edgeId) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.edgeService.findOne(edgeId, req);
    }
    async removeEdge(req, forecastId, edgeId) {
        const userId = req.user.userId;
        await this.forecastService.findOne(forecastId, userId, req);
        return this.edgeService.remove(edgeId, req);
    }
};
exports.ForecastController = ForecastController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, forecast_dto_1.CreateForecastDto]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, forecast_dto_1.UpdateForecastDto]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':forecastId/bulk-save'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, bulk_save_graph_dto_1.BulkSaveGraphDto]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "bulkSaveGraph", null);
__decorate([
    (0, common_1.Post)(':forecastId/nodes'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, forecast_node_dto_1.CreateForecastNodeDto]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "createNode", null);
__decorate([
    (0, common_1.Get)(':forecastId/nodes'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "findNodes", null);
__decorate([
    (0, common_1.Get)(':forecastId/nodes/:nodeId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Param)('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "findNode", null);
__decorate([
    (0, common_1.Patch)(':forecastId/nodes/:nodeId'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Param)('nodeId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, forecast_node_dto_1.UpdateForecastNodeDto]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "updateNode", null);
__decorate([
    (0, common_1.Delete)(':forecastId/nodes/:nodeId'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Param)('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "removeNode", null);
__decorate([
    (0, common_1.Post)(':forecastId/edges'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, forecast_edge_dto_1.CreateForecastEdgeDto]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "createEdge", null);
__decorate([
    (0, common_1.Get)(':forecastId/edges'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "findEdges", null);
__decorate([
    (0, common_1.Get)(':forecastId/edges/:edgeId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Param)('edgeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "findEdge", null);
__decorate([
    (0, common_1.Delete)(':forecastId/edges/:edgeId'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('forecastId')),
    __param(2, (0, common_1.Param)('edgeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ForecastController.prototype, "removeEdge", null);
exports.ForecastController = ForecastController = ForecastController_1 = __decorate([
    (0, common_1.Controller)('forecasts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [forecast_service_1.ForecastService,
        forecast_node_service_1.ForecastNodeService,
        forecast_edge_service_1.ForecastEdgeService])
], ForecastController);
//# sourceMappingURL=forecast.controller.js.map