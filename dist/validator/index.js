"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_validator_1 = require("../orm/database_validator");
const util_1 = require("../util");
const properties_1 = require("./properties");
const table_1 = require("./table");
class Validator {
    constructor(orm) {
        const databaseValidator = new database_validator_1.DatabaseValidator(orm);
        this.validationProperties = new properties_1.ValidationProperties(databaseValidator);
        this.validationTable = new table_1.ValidationTable(databaseValidator);
    }
    async validate(data, group = null, options = {}) {
        const groups = util_1.arrayIfNot(group);
        const fieldErrors = await this.validationProperties.validate(data, groups, options.properties);
        if (fieldErrors.hasErrors()) {
            return {
                property: fieldErrors.getErrors()
            };
        }
        const tableErrors = await this.validationTable.validate(data, groups);
        if (tableErrors.length !== 0) {
            return {
                errors: tableErrors
            };
        }
        return null;
    }
    get set() {
        return this.validationTable;
    }
    property(prop, constraints, dependentProperties) {
        this.validationProperties.property(prop, constraints, dependentProperties);
    }
}
exports.Validator = Validator;
//# sourceMappingURL=index.js.map