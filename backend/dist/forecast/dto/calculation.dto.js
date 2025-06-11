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
exports.CalculationHealthDto = exports.ForecastCalculationResultDto = exports.MetricCalculationResultDto = exports.NodeCalculationResultDto = exports.MonthlyNodeValueDto = exports.MonthlyForecastValueDto = exports.CalculateForecastDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CalculateForecastDto {
}
exports.CalculateForecastDto = CalculateForecastDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateForecastDto.prototype, "forecastId", void 0);
class MonthlyForecastValueDto {
}
exports.MonthlyForecastValueDto = MonthlyForecastValueDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MonthlyForecastValueDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], MonthlyForecastValueDto.prototype, "forecast", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], MonthlyForecastValueDto.prototype, "budget", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], MonthlyForecastValueDto.prototype, "historical", void 0);
class MonthlyNodeValueDto extends MonthlyForecastValueDto {
}
exports.MonthlyNodeValueDto = MonthlyNodeValueDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], MonthlyNodeValueDto.prototype, "calculated", void 0);
class NodeCalculationResultDto {
}
exports.NodeCalculationResultDto = NodeCalculationResultDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], NodeCalculationResultDto.prototype, "nodeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NodeCalculationResultDto.prototype, "nodeType", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => MonthlyNodeValueDto),
    __metadata("design:type", Array)
], NodeCalculationResultDto.prototype, "values", void 0);
class MetricCalculationResultDto {
}
exports.MetricCalculationResultDto = MetricCalculationResultDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MetricCalculationResultDto.prototype, "metricNodeId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => MonthlyForecastValueDto),
    __metadata("design:type", Array)
], MetricCalculationResultDto.prototype, "values", void 0);
class ForecastCalculationResultDto {
}
exports.ForecastCalculationResultDto = ForecastCalculationResultDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastCalculationResultDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastCalculationResultDto.prototype, "forecastId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ForecastCalculationResultDto.prototype, "calculatedAt", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => MetricCalculationResultDto),
    __metadata("design:type", Array)
], ForecastCalculationResultDto.prototype, "metrics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => NodeCalculationResultDto),
    __metadata("design:type", Array)
], ForecastCalculationResultDto.prototype, "allNodes", void 0);
class CalculationHealthDto {
}
exports.CalculationHealthDto = CalculationHealthDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculationHealthDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CalculationHealthDto.prototype, "timestamp", void 0);
//# sourceMappingURL=calculation.dto.js.map