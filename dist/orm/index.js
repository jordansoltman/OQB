"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const model_1 = require("./model");
const query_interface_1 = require("./query_interface");
var constant_1 = require("./constant");
exports.DataType = constant_1.DataType;
class Orm {
    constructor(knexConfig) {
        this.models = {};
        this._knex = knex_1.default(knexConfig);
        this._queryInterface = new query_interface_1.QueryInterface(this._knex);
    }
    get queryInterface() {
        return this._queryInterface;
    }
    get knex() {
        return this._knex;
    }
    transaction(transactionWrapper) {
        return this._knex.transaction((transactionScope) => {
            return transactionWrapper(transactionScope);
        });
    }
    defineModel(tableName, columns, options) {
        const model = class extends model_1.Model {
        };
        model.init(this, tableName, columns, options);
        return model;
    }
    associateAllModels() {
        const keys = Object.keys(this.models);
        keys.forEach((key) => {
            this.models[key].associate();
        });
    }
}
exports.Orm = Orm;
//# sourceMappingURL=index.js.map