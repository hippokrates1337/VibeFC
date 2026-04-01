"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableDataService = void 0;
class VariableDataService {
    getVariableValueForMonth(variableId, targetDate, variables) {
        try {
            const normalizedDate = this.normalizeToFirstOfMonth(targetDate);
            const variable = variables.find(v => v.id === variableId);
            if (!variable) {
                return null;
            }
            const targetYear = normalizedDate.getUTCFullYear();
            const targetMonth = normalizedDate.getUTCMonth();
            const timeSeriesEntry = variable.timeSeries.find(ts => {
                const tsDate = this.normalizeToFirstOfMonth(ts.date);
                return tsDate.getUTCFullYear() === targetYear && tsDate.getUTCMonth() === targetMonth;
            });
            return timeSeriesEntry?.value ?? null;
        }
        catch (error) {
            throw new Error(`Failed to get variable value: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getVariableValueWithOffset(variableId, targetDate, offsetMonths, variables) {
        try {
            const offsetDate = this.addMonths(targetDate, offsetMonths);
            return this.getVariableValueForMonth(variableId, offsetDate, variables);
        }
        catch (error) {
            throw new Error(`Failed to get variable value with offset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    normalizeToFirstOfMonth(date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    }
    async getVariableValue(variableId, targetDate, variables, offsetMonths) {
        if (offsetMonths !== undefined && offsetMonths !== 0) {
            return this.getVariableValueWithOffset(variableId, targetDate, offsetMonths, variables);
        }
        else {
            return this.getVariableValueForMonth(variableId, targetDate, variables);
        }
    }
    addMonths(date, months) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        const newMonthIndex = month + months;
        const newYear = year + Math.floor(newMonthIndex / 12);
        const modMonth = ((newMonthIndex % 12) + 12) % 12;
        return new Date(Date.UTC(newYear, modMonth, day));
    }
}
exports.VariableDataService = VariableDataService;
//# sourceMappingURL=variable-data-service.js.map