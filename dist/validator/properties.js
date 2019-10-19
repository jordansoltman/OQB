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
        // If there isn't an existing validation property then we will create one.
        if (!this.validationProperties[prop]) {
            this.validationProperties[prop] = new property_constraint_set_1.ValidationPropertyConstraintSet(this.databaseValidator);
        }
        const constraintSet = this.validationProperties[prop];
        // TODO: is this going to fuck shit up... with the above changes? Dependencies then become property wide?
        // Save the dependencies if they are set
        if (dependentProperties) {
            this.validationPropertyDependencies[prop] = dependentProperties;
        }
        constraints(constraintSet);
    }
    /**
     *
     * @param data The data to validate
     * @param groups The groups to use for validation
     * @param properties Properties to validate, if null, all properties will be vaildated
     */
    async validate(data, groups, properties = null) {
        const errors = new errors_1.ValidationPropertyErrors();
        let availableProperties = this.validationProperties;
        if (Array.isArray(properties)) {
            availableProperties = lodash_1.default.pick(availableProperties, properties);
        }
        for (const [property, constraintSet] of Object.entries(availableProperties)) {
            // Ensure that all of the dependencies have been met for this property to actually run
            const dependencies = this.validationPropertyDependencies[property];
            if (lodash_1.default.intersection(dependencies, errors.errorProperties()).length !== 0) {
                continue;
            }
            const value = data[property];
            let skipNormalValidators = false;
            let skipCustomValidators = false;
            // See if this the property is required and if it's supplied
            if (value === undefined) {
                if (constraintSet._isRequired(groups)) {
                    errors.addError(property, 'Value is required.');
                }
                // We won't keep doing anything with this if it's required but was not supplied.
                skipNormalValidators = true;
            }
            if (value === null) {
                if (constraintSet._disallowsNull(groups)) {
                    errors.addError(property, 'Value cannot be null.');
                }
                // We will keep validating, but won't do the normal validators because they
                // will all return false.
                skipNormalValidators = true;
            }
            // Unless we are skipping normal validators, will will run each of those.
            if (!skipNormalValidators) {
                for (const constraint of constraintSet.getStandardConstraintsForGroups(groups)) {
                    if (!await constraint.func(String(value), data, groups)) {
                        errors.addError(property, constraint.error);
                        // Don't check any further
                        skipCustomValidators = true;
                        break;
                    }
                }
            }
            // Run custom validators if the normal validators have succeeded.
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