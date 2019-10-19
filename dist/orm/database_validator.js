"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
class DatabaseValidator {
    constructor(orm) {
        this.orm = orm;
    }
    async exists(data, tableName, columns) {
        const where = { and: [] };
        for (const column of util_1.arrayIfNot(columns)) {
            where.and.push({ eq: [column, data[column]] });
        }
        const count = await this.orm.models[tableName].count({ where });
        return count > 0;
    }
    async unique(data, tableName, columns) {
        const where = { and: [] };
        for (const column of util_1.arrayIfNot(columns)) {
            where.and.push({ eq: [column, data[column]] });
        }
        const count = await this.orm.models[tableName].count({ where });
        return count === 0;
    }
}
exports.DatabaseValidator = DatabaseValidator;
//# sourceMappingURL=database_validator.js.map