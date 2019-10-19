"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const errors_1 = require("./errors");
const property_constraint_set_1 = require("./property_constraint_set");
class ValidationProperties {
    constructor(databaseValidator) {
        this.validationProperties = {};
        this.validationPropertyDependencies = {};
        this.databaseValidator = databaseValidator;
    }
    property(prop, constraints, dependentProperties) {
        if (!this.validationProperties[prop]) {
            this.validationProperties[prop] = new property_constraint_set_1.ValidationPropertyConstraintSet(this.databaseValidator);
        }
        const constraintSet = this.validationProperties[prop];
        if (dependentProperties) {
            this.validationPropertyDependencies[prop] = dependentProperties;
        }
        constraints(constraintSet);
    }
    async validate(data, groups, properties = null) {
        const errors = new errors_1.ValidationPropertyErrors();
        let availableProperties = this.validationProperties;
        if (Array.isArray(properties)) {
            availableProperties = lodash_1.default.pick(availableProperties, properties);
        }
        for (const [property, constraintSet] of Object.entries(availableProperties)) {
            const dependencies = this.validationPropertyDependencies[property];
            if (lodash_1.default.intersection(dependencies, errors.errorProperties()).length !== 0) {
                continue;
            }
            const value = data[property];
            let skipNormalValidators = false;
            let skipCustomValidators = false;
            if (value === undefined) {
                if (constraintSet._isRequired(groups)) {
                    errors.addError(property, 'Value is required.');
                }
                skipNormalValidators = true;
            }
            if (value === null) {
                if (constraintSet._disallowsNull(groups)) {
                    errors.addError(property, 'Value cannot be null.');
                }
                skipNormalValidators = true;
            }
            if (!skipNormalValidators) {
                for (const constraint of constraintSet.getStandardConstraintsForGroups(groups)) {
                    if (!await constraint.func(String(value), data, groups)) {
                        errors.addError(property, constraint.error);
                        skipCustomValidators = true;
                        break;
                    }
                }
            }
            if (!skipCustomValidators) {
                for (const constraint of constraintSet.getCustomConstraintsForGroups(groups)) {
                    let result;
                    result = await constraint.func(value, data, groups);
                    if (!result) {
                        errors.addError(property, constraint.error);
                        break;
                    }
                }
            }
        }
        return errors;
    }
}
exports.ValidationProperties = ValidationProperties;
//# sourceMappingURL=properties.js.map