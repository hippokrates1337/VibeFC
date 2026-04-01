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
exports.CalculationTreeRequestDto = exports.DebugCalculationRequestDto = exports.DebugCalculationResultDto = exports.DebugInfoDto = exports.DebugPerformanceMetricsDto = exports.DebugCalculationTreeDto = exports.DebugTreeNodeDto = exports.DebugCalculationStepDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const calculation_dto_1 = require("./calculation.dto");
class DebugCalculationStepDto {
}
exports.DebugCalculationStepDto = DebugCalculationStepDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DebugCalculationStepDto.prototype, "nodeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DebugCalculationStepDto.prototype, "nodeType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugCalculationStepDto.prototype, "stepNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DebugCalculationStepDto.prototype, "month", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(calculation_dto_1.CalculationTypeDto),
    __metadata("design:type", String)
], DebugCalculationStepDto.prototype, "calculationType", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], DebugCalculationStepDto.prototype, "inputs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DebugCalculationStepDto.prototype, "output", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugCalculationStepDto.prototype, "executionTimeMs", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugCalculationStepDto.prototype, "dependencies", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DebugCalculationStepDto.prototype, "errorMessage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DebugCalculationStepDto.prototype, "nodeAttributes", void 0);
class DebugTreeNodeDto {
}
exports.DebugTreeNodeDto = DebugTreeNodeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DebugTreeNodeDto.prototype, "nodeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DebugTreeNodeDto.prototype, "nodeType", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DebugTreeNodeDto.prototype, "nodeData", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => DebugTreeNodeDto),
    __metadata("design:type", Array)
], DebugTreeNodeDto.prototype, "children", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugTreeNodeDto.prototype, "inputOrder", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DebugTreeNodeDto.prototype, "position", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DebugTreeNodeDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DebugTreeNodeDto.prototype, "isReference", void 0);
class DebugCalculationTreeDto {
}
exports.DebugCalculationTreeDto = DebugCalculationTreeDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => DebugTreeNodeDto),
    __metadata("design:type", Array)
], DebugCalculationTreeDto.prototype, "trees", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugCalculationTreeDto.prototype, "executionOrder", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugCalculationTreeDto.prototype, "totalNodes", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DebugCalculationTreeDto.prototype, "dependencyGraph", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugCalculationTreeDto.prototype, "metricOrder", void 0);
class DebugPerformanceMetricsDto {
}
exports.DebugPerformanceMetricsDto = DebugPerformanceMetricsDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugPerformanceMetricsDto.prototype, "totalExecutionTimeMs", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DebugPerformanceMetricsDto.prototype, "nodeExecutionTimes", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugPerformanceMetricsDto.prototype, "cacheHitRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugPerformanceMetricsDto.prototype, "totalCacheHits", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugPerformanceMetricsDto.prototype, "totalCacheMisses", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DebugPerformanceMetricsDto.prototype, "memoryUsageMB", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DebugPerformanceMetricsDto.prototype, "phaseTimings", void 0);
class DebugInfoDto {
}
exports.DebugInfoDto = DebugInfoDto;
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_transformer_1.Type)(() => DebugCalculationTreeDto),
    __metadata("design:type", DebugCalculationTreeDto)
], DebugInfoDto.prototype, "calculationTree", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => DebugCalculationStepDto),
    __metadata("design:type", Array)
], DebugInfoDto.prototype, "calculationSteps", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_transformer_1.Type)(() => DebugPerformanceMetricsDto),
    __metadata("design:type", DebugPerformanceMetricsDto)
], DebugInfoDto.prototype, "performanceMetrics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugInfoDto.prototype, "warnings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugInfoDto.prototype, "errors", void 0);
class DebugCalculationResultDto extends calculation_dto_1.UnifiedCalculationResultDto {
}
exports.DebugCalculationResultDto = DebugCalculationResultDto;
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_transformer_1.Type)(() => DebugInfoDto),
    __metadata("design:type", DebugInfoDto)
], DebugCalculationResultDto.prototype, "debugInfo", void 0);
class DebugCalculationRequestDto {
}
exports.DebugCalculationRequestDto = DebugCalculationRequestDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(calculation_dto_1.CalculationTypeDto, { each: true }),
    __metadata("design:type", Array)
], DebugCalculationRequestDto.prototype, "calculationTypes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DebugCalculationRequestDto.prototype, "includeIntermediateNodes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DebugCalculationRequestDto.prototype, "debugLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DebugCalculationRequestDto.prototype, "includePerformanceMetrics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DebugCalculationRequestDto.prototype, "includeMemoryUsage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DebugCalculationRequestDto.prototype, "focusNodeIds", void 0);
class CalculationTreeRequestDto {
}
exports.CalculationTreeRequestDto = CalculationTreeRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CalculationTreeRequestDto.prototype, "includePositions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CalculationTreeRequestDto.prototype, "includeNodeAttributes", void 0);
//# sourceMappingURL=debug-calculation.dto.js.map