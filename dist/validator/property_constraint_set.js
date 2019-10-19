"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const validator_1 = __importDefault(require("validator"));
const util_1 = require("../util");
const types_1 = require("./types");
class ValidationPropertyConstraintSet {
    constructor(databaseValidator) {
        this.constraints = [];
        this.customConstraints = [];
        this.requiredConstraint = false;
        this.disallowNullConstraint = false;
        this.databaseValidator = databaseValidator;
    }
    getCustomConstraintsForGroups(groups) {
        return this.getConstraintsForGroups(types_1.ValidationConstraintType.CUSTOM, groups);
    }
    getStandardConstraintsForGroups(groups) {
        return this.getConstraintsForGroups(types_1.ValidationConstraintType.STANDARD, groups);
    }
    setRequired(group) {
        if (!group) {
            this.requiredConstraint = true;
        }
        else {
            this.requiredConstraint = util_1.arrayIfNot(group);
        }
    }
    setDisallowNull(group) {
        if (!group) {
            this.disallowNullConstraint = true;
        }
        else {
            this.disallowNullConstraint = util_1.arrayIfNot(group);
        }
    }
    isAlphanumeric(options = {}) {
        const error = options.error ? options.error : 'Must be alpha-numeric.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isAlphanumeric.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isISO8601(options = {}) {
        const error = options.error ? options.error : 'Must be valid ISO8601 date string.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isISO8601.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isWhitelisted(options = {}) {
        const error = options.error ? options.error : 'Password contains invalid characters.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isWhitelisted.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isLength(options = {}) {
        const error = options.error ? options.error : 'Must be within the valid length range.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isLength.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isBoolean(options = {}) {
        const error = options.error ? options.error : 'Must be a valid email address.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isBoolean.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isEmail(options = {}) {
        const error = options.error ? options.error : 'Must be a valid email address.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isEmail.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isInt(options = {}) {
        const error = options.error ? options.error : 'Must be an integer.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isInt.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isNotEmpty(options = {}) {
        const error = options.error ? options.error : 'Cannot be empty.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return !validator_1.default.isEmpty.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    isEmpty(options = {}) {
        const error = options.error ? options.error : 'Must be empty.';
        const args = options.args ? options.args : [];
        const func = (value) => {
            return validator_1.default.isEmpty.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    /**
     * Checks if the property is an int and exists on the table. The default column name is 'id'.
     * @param tableName
     * @param column
     * @param options
     */
    key(tableName, column = 'id', options = {}) {
        this.isInt(options);
        this.exists(tableName, column, options);
    }
    // TODO: add soft delete option!
    exists(tableName, column = 'id', options = {}) {
        const error = options.error ? options.error : 'This value doesn\'t exist';
        const func = (value) => {
            return this.databaseValidator.exists({ [column]: value }, tableName, column);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    unique(tableName, column = 'id', options = {}) {
        const error = options.error ? options.error : 'This values must be unique in the database.';
        const func = (value) => {
            return this.databaseValidator.unique({ [column]: value }, tableName, column);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    addCustomConstraint(func, error, options = {}) {
        this.addConstraint(func, error, { groups: options.group, type: types_1.ValidationConstraintType.CUSTOM });
    }
    _isRequired(groups) {
        if (typeof this.requiredConstraint === 'boolean') {
            return this.requiredConstraint;
        }
        else {
            return lodash_1.default.intersection(this.requiredConstraint, groups).length > 0;
        }
    }
    _disallowsNull(groups) {
        if (typeof this.disallowNullConstraint === 'boolean') {
            return this.disallowNullConstraint;
        }
        else {
            return lodash_1.default.intersection(this.disallowNullConstraint, groups).length > 0;
        }
    }
    getConstraintsForGroups(type, groups) {
        const constraints = type === types_1.ValidationConstraintType.STANDARD ? this.constraints : this.customConstraints;
        return constraints.filter((constraint) => {
            if (constraint.groups === null) {
                return true;
            } // All contraints without a group are returned
            if (groups) {
                return lodash_1.default.intersection(constraint.groups, groups).length > 0;
            }
        });
    }
    addConstraint(func, error, options = {}) {
        const groups = Array.isArray(options.groups) || typeof options.groups === 'string' ?
            util_1.arrayIfNot(options.groups) :
            null;
        const type = options.type ? options.type : types_1.ValidationConstraintType.STANDARD;
        const constraint = { func, error, groups };
        if (type === types_1.ValidationConstraintType.CUSTOM) {
            this.customConstraints.push(constraint);
        }
        else {
            this.constraints.push(constraint);
        }
    }
}
exports.ValidationPropertyConstraintSet = ValidationPropertyConstraintSet;
//# sourceMappingURL=property_constraint_set.js.map