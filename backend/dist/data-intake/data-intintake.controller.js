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
exports.DataIntakeController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const data_intake_service_1 = require("./data-intake.service");
const add_variables_dto_1 = require("./dto/add-variables.dto");
const update_variables_dto_1 = require("./dto/update-variables.dto");
const delete_variables_dto_1 = require("./dto/delete-variables.dto");
let DataIntakeController = class DataIntakeController {
    constructor(dataIntakeService) {
        this.dataIntakeService = dataIntakeService;
    }
    async addVariables(req, addVariablesDto) {
        const userId = req.user?.id;
        if (!userId) {
            this.logger.error('User ID not found on request after AuthGuard');
            throw new HttpException('Authentication error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        try {
            if (!addVariablesDto.variables || addVariablesDto.variables.length === 0) {
                this.logger.warn('Empty variables array in add request');
                throw new HttpException('No variables provided for addition', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.dataIntakeService.addVariables(addVariablesDto);
            return result;
        }
        catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error in addVariables', error);
            throw new HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getVariablesByUser(req, userId) {
        const requestingUserId = req.user?.id;
        if (!requestingUserId) {
            this.logger.warn('No user ID provided in request');
            throw new HttpException('Authentication error', common_1.HttpStatus.UNAUTHORIZED);
        }
        try {
            if (!userId) {
                this.logger.warn('No user ID provided in request');
                throw new HttpException('No user ID provided', common_1.HttpStatus.BAD_REQUEST);
            }
            return await this.dataIntakeService.getVariablesByUser(userId);
        }
        catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error in getVariablesByUser', error);
            throw new HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateVariables(req, updateVariablesDto) {
        const userId = req.user?.id;
        if (!userId) {
            this.logger.error('User ID not found on request after AuthGuard');
            throw new HttpException('Authentication error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        try {
            if (!updateVariablesDto.variables || updateVariablesDto.variables.length === 0) {
                this.logger.warn('Empty variables array in update request');
                throw new HttpException('No variables provided for update', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.dataIntakeService.updateVariables(updateVariablesDto);
            return result;
        }
        catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error in updateVariables', error);
            throw new HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteVariables(req, deleteVariablesDto) {
        const userId = req.user?.id;
        if (!userId) {
            this.logger.error('User ID not found on request after AuthGuard');
            throw new HttpException('Authentication error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        try {
            if (!deleteVariablesDto.ids || deleteVariablesDto.ids.length === 0) {
                this.logger.warn('Empty IDs array in delete request');
                throw new HttpException('No variable IDs provided for deletion', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.dataIntakeService.deleteVariables(deleteVariablesDto);
            return result;
        }
        catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error('Error in deleteVariables', error);
            throw new HttpException('Internal server error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DataIntakeController = DataIntakeController;
__decorate([
    Post('variables'),
    __param(0, (0, common_2.Req)()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_variables_dto_1.AddVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "addVariables", null);
__decorate([
    Get('variables/:userId'),
    __param(0, (0, common_2.Req)()),
    __param(1, Param('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "getVariablesByUser", null);
__decorate([
    Put('variables'),
    __param(0, (0, common_2.Req)()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_variables_dto_1.UpdateVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "updateVariables", null);
__decorate([
    Delete('variables'),
    __param(0, (0, common_2.Req)()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_variables_dto_1.DeleteVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "deleteVariables", null);
exports.DataIntakeController = DataIntakeController = __decorate([
    Controller('data-intake'),
    __metadata("design:paramtypes", [data_intake_service_1.DataIntakeService])
], DataIntakeController);
//# sourceMappingURL=data-intintake.controller.js.map