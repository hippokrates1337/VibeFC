"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.CalculationError = void 0;
class CalculationError extends Error {
    constructor(message, errors = [], nodeId, calculationType) {
        super(message);
        this.errors = errors;
        this.nodeId = nodeId;
        this.calculationType = calculationType;
        this.name = 'CalculationError';
    }
}
exports.CalculationError = CalculationError;
class ValidationError extends Error {
    constructor(message, validationErrors) {
        super(message);
        this.validationErrors = validationErrors;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=calculation-types.js.map