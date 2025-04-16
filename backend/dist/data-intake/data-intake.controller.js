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
const add_variables_dto_1 = require("./dto/add-variables.dto");
let DataIntakeController = DataIntakeController_1 = class DataIntakeController {
    constructor(dataIntakeService) {
        this.dataIntakeService = dataIntakeService;
        this.logger = new common_1.Logger(DataIntakeController_1.name);
    }
    async addVariables(addVariablesDto) {
        try {
            if (!addVariablesDto.variables || addVariablesDto.variables.length === 0) {
                this.logger.warn('Empty variables array in request');
                throw new common_1.HttpException('No variables provided in request', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.dataIntakeService.addVariables(addVariablesDto);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error processing add-variables request: ${error.message}`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                message: `Failed to add variables: ${error.message}`,
                error: 'Internal Server Error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.DataIntakeController = DataIntakeController;
__decorate([
    (0, common_1.Post)('add-variables'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_variables_dto_1.AddVariablesDto]),
    __metadata("design:returntype", Promise)
], DataIntakeController.prototype, "addVariables", null);
exports.DataIntakeController = DataIntakeController = DataIntakeController_1 = __decorate([
    (0, common_1.Controller)('data-intake'),
    __metadata("design:paramtypes", [data_intake_service_1.DataIntakeService])
], DataIntakeController);
//# sourceMappingURL=data-intake.controller.js.map