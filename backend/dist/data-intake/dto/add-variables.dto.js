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
exports.AddVariablesDto = exports.VariableDto = exports.TimeSeriesPoint = exports.VariableType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var VariableType;
(function (VariableType) {
    VariableType["ACTUAL"] = "ACTUAL";
    VariableType["BUDGET"] = "BUDGET";
    VariableType["INPUT"] = "INPUT";
    VariableType["UNKNOWN"] = "UNKNOWN";
})(VariableType || (exports.VariableType = VariableType = {}));
class TimeSeriesPoint {
}
exports.TimeSeriesPoint = TimeSeriesPoint;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TimeSeriesPoint.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], TimeSeriesPoint.prototype, "value", void 0);
class VariableDto {
}
exports.VariableDto = VariableDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariableDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(VariableType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariableDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VariableDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], VariableDto.prototype, "values", void 0);
class AddVariablesDto {
}
exports.AddVariablesDto = AddVariablesDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VariableDto),
    __metadata("design:type", Array)
], AddVariablesDto.prototype, "variables", void 0);
//# sourceMappingURL=add-variables.dto.js.map