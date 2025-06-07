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
            const timeSeriesEntry = variable.timeSeries.find(ts => this.normalizeToFirstOfMonth(ts.date).getTime() === normalizedDate.getTime());
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
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
}
exports.VariableDataService = VariableDataService;
//# sourceMappingURL=variable-data-service.js.map