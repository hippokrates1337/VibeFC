"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodService = void 0;
const common_1 = require("@nestjs/common");
let PeriodService = class PeriodService {
    processPeriods(periods) {
        const forecastMonths = this.getMonthsBetween(periods.forecast.start, periods.forecast.end);
        const actualMonths = this.getMonthsBetween(periods.actual.start, periods.actual.end);
        const allMonths = [...new Set([...forecastMonths, ...actualMonths])].sort((a, b) => this.compareMonths(a, b));
        return {
            forecastMonths,
            actualMonths,
            allMonths
        };
    }
    validatePeriods(periods) {
        const errors = [];
        const warnings = [];
        if (!this.isValidMMYYYY(periods.forecast.start)) {
            errors.push(`Invalid forecast start period format: ${periods.forecast.start}`);
        }
        if (!this.isValidMMYYYY(periods.forecast.end)) {
            errors.push(`Invalid forecast end period format: ${periods.forecast.end}`);
        }
        if (!this.isValidMMYYYY(periods.actual.start)) {
            errors.push(`Invalid actual start period format: ${periods.actual.start}`);
        }
        if (!this.isValidMMYYYY(periods.actual.end)) {
            errors.push(`Invalid actual end period format: ${periods.actual.end}`);
        }
        if (this.compareMonths(periods.forecast.start, periods.forecast.end) >= 0) {
            errors.push('Forecast start period must be before end period');
        }
        if (this.compareMonths(periods.actual.start, periods.actual.end) >= 0) {
            errors.push('Actual start period must be before end period');
        }
        if (this.compareMonths(periods.actual.end, periods.forecast.start) >= 0 &&
            this.compareMonths(periods.actual.start, periods.forecast.end) <= 0) {
            errors.push('Actual period cannot overlap with forecast period');
        }
        if (this.compareMonths(periods.actual.start, periods.forecast.start) >= 0) {
            warnings.push('Actual period typically comes before forecast period');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    isValidMMYYYY(month) {
        return /^(0[1-9]|1[0-2])-\d{4}$/.test(month);
    }
    compareMonths(month1, month2) {
        if (!this.isValidMMYYYY(month1) || !this.isValidMMYYYY(month2)) {
            throw new Error('Invalid MM-YYYY format');
        }
        const [m1, y1] = month1.split('-').map(Number);
        const [m2, y2] = month2.split('-').map(Number);
        if (y1 !== y2) {
            return y1 - y2;
        }
        return m1 - m2;
    }
    getMonthsBetween(startMonth, endMonth) {
        if (!this.isValidMMYYYY(startMonth) || !this.isValidMMYYYY(endMonth)) {
            throw new Error('Invalid MM-YYYY format');
        }
        const months = [];
        let current = startMonth;
        while (this.compareMonths(current, endMonth) <= 0) {
            months.push(current);
            current = this.addMonths(current, 1);
        }
        return months;
    }
    addMonths(month, monthsToAdd) {
        if (!this.isValidMMYYYY(month)) {
            throw new Error('Invalid MM-YYYY format');
        }
        const [m, y] = month.split('-').map(Number);
        const date = new Date(y, m - 1, 1);
        date.setMonth(date.getMonth() + monthsToAdd);
        return this.dateToMMYYYY(date);
    }
    subtractMonths(month, monthsToSubtract) {
        return this.addMonths(month, -monthsToSubtract);
    }
    dateToMMYYYY(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${year}`;
    }
    mmyyyyToFirstOfMonth(month) {
        if (!this.isValidMMYYYY(month)) {
            throw new Error('Invalid MM-YYYY format');
        }
        const [m, y] = month.split('-').map(Number);
        return new Date(y, m - 1, 1);
    }
    isInForecastPeriod(month, periods) {
        return periods.forecastMonths.includes(month);
    }
    isInActualPeriod(month, periods) {
        return periods.actualMonths.includes(month);
    }
};
exports.PeriodService = PeriodService;
exports.PeriodService = PeriodService = __decorate([
    (0, common_1.Injectable)()
], PeriodService);
//# sourceMappingURL=period-service.js.map