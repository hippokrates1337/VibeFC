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
exports.ForecastNodeDto = exports.UpdateForecastNodeDto = exports.CreateForecastNodeDto = exports.ForecastNodeKind = void 0;
const class_validator_1 = require("class-validator");
var ForecastNodeKind;
(function (ForecastNodeKind) {
    ForecastNodeKind["DATA"] = "DATA";
    ForecastNodeKind["CONSTANT"] = "CONSTANT";
    ForecastNodeKind["OPERATOR"] = "OPERATOR";
    ForecastNodeKind["METRIC"] = "METRIC";
    ForecastNodeKind["SEED"] = "SEED";
})(ForecastNodeKind || (exports.ForecastNodeKind = ForecastNodeKind = {}));
class CreateForecastNodeDto {
}
exports.CreateForecastNodeDto = CreateForecastNodeDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateForecastNodeDto.prototype, "forecastId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(ForecastNodeKind),
    __metadata("design:type", String)
], CreateForecastNodeDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateForecastNodeDto.prototype, "attributes", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateForecastNodeDto.prototype, "position", void 0);
class UpdateForecastNodeDto {
}
exports.UpdateForecastNodeDto = UpdateForecastNodeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ForecastNodeKind),
    __metadata("design:type", String)
], UpdateForecastNodeDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateForecastNodeDto.prototype, "attributes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateForecastNodeDto.prototype, "position", void 0);
class ForecastNodeDto {
}
exports.ForecastNodeDto = ForecastNodeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastNodeDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastNodeDto.prototype, "forecastId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ForecastNodeKind),
    __metadata("design:type", String)
], ForecastNodeDto.prototype, "kind", void 0);
//# sourceMappingURL=forecast-node.dto.js.map