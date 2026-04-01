"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MMYYYYUtilsService = void 0;
class MMYYYYUtilsService {
    constructor() {
        this.MM_YYYY_PATTERN = /^(0[1-9]|1[0-2])-\d{4}$/;
    }
    isValidMMYYYY(month) {
        return this.MM_YYYY_PATTERN.test(month);
    }
    addMonths(month, monthsToAdd) {
        if (!this.isValidMMYYYY(month)) {
            throw new Error(`Invalid MM-YYYY format: ${month}`);
        }
        const [monthStr, yearStr] = month.split('-');
        const currentMonth = parseInt(monthStr, 10);
        const currentYear = parseInt(yearStr, 10);
        const totalMonths = (currentYear * 12) + currentMonth + monthsToAdd;
        const newYear = Math.floor((totalMonths - 1) / 12);
        const newMonth = ((totalMonths - 1) % 12) + 1;
        return `${newMonth.toString().padStart(2, '0')}-${newYear}`;
    }
    subtractMonths(month, monthsToSubtract) {
        return this.addMonths(month, -monthsToSubtract);
    }
    compareMonths(month1, month2) {
        if (!this.isValidMMYYYY(month1) || !this.isValidMMYYYY(month2)) {
            throw new Error(`Invalid MM-YYYY format: ${month1} or ${month2}`);
        }
        const [month1Str, year1Str] = month1.split('-');
        const [month2Str, year2Str] = month2.split('-');
        const date1Value = parseInt(year1Str, 10) * 12 + parseInt(month1Str, 10);
        const date2Value = parseInt(year2Str, 10) * 12 + parseInt(month2Str, 10);
        if (date1Value < date2Value)
            return -1;
        if (date1Value > date2Value)
            return 1;
        return 0;
    }
    getMonthsBetween(startMonth, endMonth) {
        if (!this.isValidMMYYYY(startMonth) || !this.isValidMMYYYY(endMonth)) {
            throw new Error(`Invalid MM-YYYY format: ${startMonth} or ${endMonth}`);
        }
        const months = [];
        let current = startMonth;
        while (this.compareMonths(current, endMonth) <= 0) {
            months.push(current);
            if (current === endMonth)
                break;
            current = this.addMonths(current, 1);
        }
        return months;
    }
    dateToMMYYYY(date) {
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = date.getUTCFullYear().toString();
        return `${month}-${year}`;
    }
    mmyyyyToFirstOfMonth(month) {
        if (!this.isValidMMYYYY(month)) {
            throw new Error(`Invalid MM-YYYY format: ${month}`);
        }
        const [monthStr, yearStr] = month.split('-');
        const monthNum = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);
        return new Date(Date.UTC(year, monthNum - 1, 1));
    }
}
exports.MMYYYYUtilsService = MMYYYYUtilsService;
//# sourceMappingURL=mmyyyy-utils.js.map