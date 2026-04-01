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
exports.ForecastDto = exports.UpdateForecastPeriodsDto = exports.UpdateForecastDto = exports.CreateForecastDto = void 0;
const class_validator_1 = require("class-validator");
const date_range_validator_1 = require("../../validators/date-range.validator");
const MM_YYYY_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;
class CreateForecastDto {
}
exports.CreateForecastDto = CreateForecastDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "forecastStartDate", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsDateString)(),
    (0, date_range_validator_1.ValidateDateRange)('forecastStartDate', { message: 'End date must be after or equal to start date' }),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "forecastEndDate", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "organizationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'forecastStartMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "forecastStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'forecastEndMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "forecastEndMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'actualStartMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "actualStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'actualEndMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], CreateForecastDto.prototype, "actualEndMonth", void 0);
class UpdateForecastDto {
}
exports.UpdateForecastDto = UpdateForecastDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "forecastStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "forecastEndDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'forecastStartMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "forecastStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'forecastEndMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "forecastEndMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'actualStartMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "actualStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'actualEndMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastDto.prototype, "actualEndMonth", void 0);
class UpdateForecastPeriodsDto {
}
exports.UpdateForecastPeriodsDto = UpdateForecastPeriodsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'forecastStartMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastPeriodsDto.prototype, "forecastStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'forecastEndMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastPeriodsDto.prototype, "forecastEndMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'actualStartMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastPeriodsDto.prototype, "actualStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(MM_YYYY_PATTERN, { message: 'actualEndMonth must be in MM-YYYY format' }),
    __metadata("design:type", String)
], UpdateForecastPeriodsDto.prototype, "actualEndMonth", void 0);
class ForecastDto {
}
exports.ForecastDto = ForecastDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "forecastStartDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "forecastEndDate", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "organizationId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "forecastStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "forecastEndMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "actualStartMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForecastDto.prototype, "actualEndMonth", void 0);
//# sourceMappingURL=forecast.dto.js.map