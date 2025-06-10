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
var DataIntakeController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIntakeController = void 0;
const common_1 = require("@nestjs/common");
const data_intake_service_1 = require("./data-intake.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const add_variables_dto_1 = require("./dto/add-variables.dto");
const update_variables_dto_1 = require("./dto/update-variables.dto");
const delete_variables_dto_1 = require("./dto/delete-variables.dto");
let DataIntakeController = DataIntakeController_1 = class DataIntakeController {
    constructor(dataIntakeService) {
        this.dataIntakeService = dataIntakeService;
        this.logger = new common_1.Logger(DataIntakeController_1.name);
    }
    async addVariables(req, addVariablesDto) {
        try {
            this.logger.log(`Received add variables request with ${addVariablesDto?.variables?.length || 0} variables`);
            if (!addVariablesDto.variables || addVariablesDto.variables.length === 0) {
                this.logger.warn('Empty variables array in request');
                throw new common_1.HttpException('No variables provided in request', common_1.HttpStatus.BAD_REQUEST);
            }
            if (req.user) {
                addVariablesDto.variables.forEach(variable => {
                    if (!variable.user_id) {
                        variable.user_id = req.user.userId;
                    }
                    if (!variable.organization_id && req.user.organizationId) {
                        variable.organization_id = req.user.organizationId;
                    }
                });
            }
            const result = await this.dataIntakeService.addVariables(addVariablesDto, req);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error processing variables creation request: ${error.message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Failed to add variables: ${error.message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getVariablesByUser(req, userId) {
        try {
            this.logger.log(`Fetching variables for user: ${userId}`);
            if (!userId) {
                this.logger.warn('No user ID provided in request');
                throw new common_1.HttpException('User ID is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.dataIntakeService.getVariablesByUser(userId, req);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error retrieving variables for user ${userId}: ${error.message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Failed to retrieve variables: ${error.message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateVariables(req, updateVariablesDto) {
        try {
            this.logger.log(`Received update variables request with ${updateVariablesDto?.variables?.length || 0} variables`);
            if (!updateVariablesDto.variables || updateVariablesDto.variables.length === 0) {
                this.logger.warn('Empty variables array in update request');
                throw new common_1.HttpException('No variables provided for update', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.dataIntakeService.updateVariables(updateVariablesDto, req);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error processing update-variables request: ${error.message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Failed to update variables: ${error.message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteVariables(req, deleteVariablesDto) {
        try {
            this.logger.log(`Received delete variables request with ${deleteVariablesDto?.ids?.length || 0} variables from user ${req.user?.userId}`);
            const { ids, organizationId } = deleteVariablesDto;
            if (!ids || ids.length === 0) {
                this.logger.warn('Empty IDs array in delete request');
                throw new common_1.HttpException('No variable IDs provided for deletion', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!organizationId) {
                this.logger.warn('Organization ID missing in delete request body');
                throw new common_1.HttpException('Organization ID must be provided in the request body', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!req.user || !req.user.userId) {
                this.logger.error('User ID missing in request context for deletion');
                throw new common_1.HttpException('Authentication context is missing', common_1.HttpStatus.UNAUTHORIZED);
            }
            const result = await this.dataIntakeService.deleteVariables({ ids }, req.user.userId, organizationId, req);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error processing delete-variables request: ${error.message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Failed to delete variables: ${error.message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DataIntakeController = DataIntakeController;
__decorate([
    (0, common_1.Post)('variables'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_variables_dto_1.AddVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "addVariables", null);
__decorate([
    (0, common_1.Get)('variables/:userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "getVariablesByUser", null);
__decorate([
    (0, common_1.Put)('variables'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_variables_dto_1.UpdateVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "updateVariables", null);
__decorate([
    (0, common_1.Delete)('variables'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_variables_dto_1.DeleteVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "deleteVariables", null);
exports.DataIntakeController = DataIntakeController = DataIntakeController_1 = __decorate([
    (0, common_1.Controller)('data-intake'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [data_intake_service_1.DataIntakeService])
], DataIntakeController);
//# sourceMappingURL=data-intake.controller.js.map