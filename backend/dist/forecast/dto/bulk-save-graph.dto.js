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
exports.FlattenedForecastWithDetailsDto = exports.BulkSaveGraphDto = exports.BulkEdgeDto = exports.BulkNodeDto = exports.ForecastMetadataDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ForecastMetadataDto {
}
exports.ForecastMetadataDto = ForecastMetadataDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ForecastMetadataDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ForecastMetadataDto.prototype, "forecastStartDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ForecastMetadataDto.prototype, "forecastEndDate", void 0);
class BulkNodeDto {
}
exports.BulkNodeDto = BulkNodeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkNodeDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkNodeDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], BulkNodeDto.prototype, "attributes", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], BulkNodeDto.prototype, "position", void 0);
class BulkEdgeDto {
}
exports.BulkEdgeDto = BulkEdgeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkEdgeDto.prototype, "sourceClientId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkEdgeDto.prototype, "targetClientId", void 0);
class BulkSaveGraphDto {
}
exports.BulkSaveGraphDto = BulkSaveGraphDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ForecastMetadataDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", ForecastMetadataDto)
], BulkSaveGraphDto.prototype, "forecast", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkNodeDto),
    __metadata("design:type", Array)
], BulkSaveGraphDto.prototype, "nodes", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkEdgeDto),
    __metadata("design:type", Array)
], BulkSaveGraphDto.prototype, "edges", void 0);
class FlattenedForecastWithDetailsDto {
}
exports.FlattenedForecastWithDetailsDto = FlattenedForecastWithDetailsDto;
//# sourceMappingURL=bulk-save-graph.dto.js.map