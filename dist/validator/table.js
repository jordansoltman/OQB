"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const util_1 = require("../util");
class ValidationTable {
    constructor(databaseValidator) {
        this.constraints = [];
        this.databaseValidator = databaseValidator;
    }
    /**
     *
     * @param func The function to use to validate this contraint
     * @param options An options object that contains an error string, and any groups that this
     * contraint should be associated with. Error MUST be defined if the TableValidationFunction
     * returns a boolean instead of a string. If groups are left as null/undefined, then this will
     * run for every group.
     */
    addConstraint(func, options = {}) {
        const groups = Array.isArray(options.groups) || typeof options.groups === 'string' ?
            util_1.arrayIfNot(options.groups) :
            null;
        const constraint = { func, error: options.error, groups };
        this.constraints.push(constraint);
    }
    /**
     * BUILT IN TABLE VAILDATIONS
     */
    // TODO: move these to an "extension" of the validator
    unique(tableName, column, options = {}) {
        const error = options.error ? options.error : 'Record already exists and is not unique.';
        const func = (data) => {
            return this.databaseValidator.unique(data, tableName, column);
        };
        this.addConstraint(func, { error, groups: options.groups });
    }
    exists(tableName, column, options = {}) {
        const error = options.error ? options.error : 'Record does not exist.';
        const func = (data) => {
            return this.databaseValidator.exists(data, tableName, column);
        };
        this.addConstraint(func, { error, groups: options.groups });
    }
    async validate(data, groups) {
        const errors = [];
        const constraints = this.getContraints(groups);
        // Get the group constraints which will either be of the group type or all.
        for (const constraint of constraints) {
            const result = await constraint.func(data, groups);
            if (result === false) {
                if (!constraint.error) {
                    throw new Error('No error given for constraint!');
                }
                errors.push(constraint.error);
            }
            else if (typeof result === 'string') {
                errors.push(result);
            }
        }
        return errors;
    }
    getContraints(groups) {
        // If group is declared, we only get the contraints matching
        // the group as well as the ones with no group. If a group is
        // not declared, we only get the constraints without any group.
        return this.constraints.filter((constraint) => {
            if (constraint.groups === null) {
                return true;
            } // All contraints without a group are returned
            if (groups) {
                return lodash_1.default.intersection(constraint.groups, groups).length > 0;
            }
        });
    }
}
exports.ValidationTable = ValidationTable;
//# sourceMappingURL=table.js.map