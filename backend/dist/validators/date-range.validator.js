"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateDateRange = ValidateDateRange;
const class_validator_1 = require("class-validator");
function ValidateDateRange(property, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'validateDateRange',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return new Date(value) >= new Date(relatedValue);
                }
            }
        });
    };
}
//# sourceMappingURL=date-range.validator.js.map