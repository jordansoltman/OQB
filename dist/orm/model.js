"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
const luxon_1 = require("luxon");
const nesthydrationjs_1 = __importDefault(require("nesthydrationjs"));
const util_1 = require("../util");
const validator_1 = require("../validator");
const assocations_1 = require("./assocations");
const constant_1 = require("./constant");
const nh = nesthydrationjs_1.default();
class Model {
    static get queryInterface() {
        return this.orm.queryInterface;
    }
    static get knex() {
        return this.orm.knex;
    }
    static associate() { }
    static init(orm, name, columns, options) {
        this.orm = orm;
        const defaultModelOptions = {
            softDeletes: false,
            timeStamps: true
        };
        const modelOptions = Object.assign({}, defaultModelOptions, options);
        if (modelOptions.timeStamps) {
            columns.created_at = { type: constant_1.DataType.DATETIME };
            columns.updated_at = { type: constant_1.DataType.DATETIME };
        }
        if (modelOptions.softDeletes) {
            columns.deleted_at = { type: constant_1.DataType.DATETIME };
        }
        const columnObjects = {};
        for (const [name, columnOrType] of Object.entries(columns)) {
            const column = typeof columnOrType === 'string' ? { type: columnOrType } : columnOrType;
            columnObjects[name] = Object.assign(Object.assign({ name }, column), { primary: column.primary === true, type: column.type ? column.type : constant_1.DataType.STRING });
        }
        const primaryKeyColumnNames = Object.values(columnObjects)
            .filter((column) => column.primary)
            .map((column) => column.name);
        if (primaryKeyColumnNames.length < 1) {
            throw new Error(`Table ${name} needs at least one column identified as a primary key.`);
        }
        this.orm = orm;
        this.tableName = name;
        this.columns = columnObjects;
        this.columnNames = Object.keys(columns);
        this.associations = {};
        this.primaryKeyColumnNames = primaryKeyColumnNames;
        this.softDeletes = modelOptions.softDeletes;
        this.timeStamps = modelOptions.timeStamps;
        this.hooks = util_1.arrayIfNot(modelOptions.hooks);
        orm.models[this.tableName] = this;
    }
    static validate(data, group, options) {
        return this.validator.validate(data, group, options);
    }
    static convertValuesForDatatabase(values) {
        const convertedValues = _.cloneDeep(values);
        for (const [key, value] of Object.entries(convertedValues)) {
            const column = this.columns[key];
            if (column && column.type) {
                switch (column.type) {
                    case constant_1.DataType.DATETIME:
                    case constant_1.DataType.DATE:
                        if (typeof value === 'string') {
                            convertedValues[key] = luxon_1.DateTime.fromISO(value).toJSDate();
                        }
                        break;
                }
            }
        }
        return convertedValues;
    }
    static async insert(values, options = {}) {
        if (options.skipValidation !== false) {
        }
        const convertedValues = util_1.arrayIfNot(values).map((value) => this.convertValuesForDatatabase(value));
        const insertValues = [];
        for (const value of convertedValues) {
            if (this.timeStamps) {
                insertValues.push(Object.assign({ created_at: this.knex.fn.now(), updated_at: this.knex.fn.now() }, value));
            }
            else {
                insertValues.push(value);
            }
        }
        const result = await this.queryInterface.insert(this, insertValues, options);
        if (Array.isArray(values)) {
            return null;
        }
        const includedPrimaryKeys = _.intersection(Object.keys(values), this.primaryKeyColumnNames);
        if (includedPrimaryKeys.length > 0) {
            return _.pick(values, includedPrimaryKeys);
        }
        else if (this.primaryKeyColumnNames.length === 1 && Array.isArray(result) && result.length === 1) {
            return { [this.primaryKeyColumnNames[0]]: result[0] };
        }
        return null;
    }
    static async update(values, options = {}) {
        if (this.timeStamps && options.silent !== true) {
            values.updated_at = this.knex.fn.now();
        }
        return await this.queryInterface.update(this, values, options);
    }
    static async delete(options = {}) {
        if (this.softDeletes && options.overrideSoftDelete !== true) {
            const deletedAt = options.deleteTime ? options.deleteTime : this.knex.fn.now();
            return await this.update({ deleted_at: deletedAt }, Object.assign(Object.assign({}, options), { silent: true }));
        }
        else {
            return await this.queryInterface.delete(this, options);
        }
    }
    static async findOne(options = {}) {
        options.limit = 1;
        const [query, , definition] = this.queryInterface.select(this, options);
        const queryResult = await query;
        return nh.nest(queryResult, definition);
    }
    static async findOneById(key, options = {}) {
        if (this.primaryKeyColumnNames.length > 1 && (typeof key === 'string' || typeof key === 'number')) {
            throw new Error('This table has a composite key. Primary key must be passed as key/value pairs');
        }
        let primaryKeys;
        if (typeof key === 'string' || typeof key === 'number') {
            primaryKeys = {
                [this.primaryKeyColumnNames[0]]: key
            };
        }
        else {
            primaryKeys = key;
        }
        const whereKeys = [];
        for (const [primaryKey, value] of Object.entries(primaryKeys)) {
            whereKeys.push({ eq: [primaryKey, value] });
        }
        if (options.where) {
            options.where = {
                and: [options.where, ...whereKeys]
            };
        }
        else {
            options.where = {
                and: whereKeys
            };
        }
        return this.findOne(options);
    }
    static async findAll(options = {}) {
        const [query, countQuery, definition] = this.queryInterface.select(this, options);
        const [rawRows, rawCount] = await Promise.all([query, countQuery]);
        const count = rawCount[0].count;
        return [nh.nest(rawRows, [definition]), count];
    }
    static async count(options = {}) {
        const [, countQuery] = this.queryInterface.select(this, options);
        const count = await countQuery;
        return count[0].count;
    }
    static configureValidator(validator) { }
    static get validator() {
        const validator = new validator_1.Validator(this.orm);
        this.configureValidator(validator);
        return validator;
    }
    static hasMany({ to, as, foreignKey }) {
        if (!to || !(to.prototype instanceof Model)) {
            throw new Error(`Belongs to many relationship: ${as}, from model: ${this.tableName} could
            not be established because the 'to' model is not defined, or is not a model.`);
        }
        if (typeof foreignKey === 'string' && this.primaryKeyColumnNames.length > 1) {
            throw new Error(`Has many relationship (${as}) from ${this.tableName} to ${to.tableName} requires a
            foreign key map because ${this.tableName} has a composite primary key.`);
        }
        const foreignKeyMap = typeof foreignKey === 'string' ?
            { [this.primaryKeyColumnNames[0]]: foreignKey } :
            foreignKey;
        const association = new assocations_1.HasManyAssocation(to, foreignKeyMap);
        this._associate(as, association);
    }
    static belongsToMany({ to, toKey, through, fromKey, as }) {
        if (!to || !(to.prototype instanceof Model)) {
            throw new Error(`Belongs to many relationship: ${as}, from model: ${this.tableName} could
            not be established because the 'to' model is not defined, or is not a model.`);
        }
        if (!through || !(through.prototype instanceof Model)) {
            throw new Error(`Belongs to many relationship: ${as}, from model: ${this.tableName} could
            not be established because the 'through' model is not defined, or is not a model.`);
        }
        if (typeof fromKey === 'string' && this.primaryKeyColumnNames.length > 1) {
            throw new Error(`Belongs to many relationship (${as}) from ${this.tableName} to ${to.tableName} requires
            a foreign key map because ${this.tableName} has a composite primary key.`);
        }
        if (typeof toKey === 'string' && to.primaryKeyColumnNames.length > 1) {
            throw new Error(`Belongs to many relationship (${as}) from ${this.tableName} to ${to.tableName} requires
            a foreign key map because ${to.tableName} has a composite primary key.`);
        }
        const fromKeyMap = typeof fromKey === 'string' ?
            { [this.primaryKeyColumnNames[0]]: fromKey } :
            fromKey;
        const toKeyMap = typeof toKey === 'string' ?
            { [toKey]: to.primaryKeyColumnNames[0] } :
            toKey;
        const assocation = new assocations_1.BelongsToManyAssociation(to, through, fromKeyMap, toKeyMap);
        this._associate(as, assocation);
    }
    static hasOne({ to, as, foreignKey }) {
        if (!to || !(to.prototype instanceof Model)) {
            throw new Error(`Has one many relationship: ${as} from model: ${this.tableName} could
            not be established because the 'to' model is not defined, or is not a model.`);
        }
        if (typeof foreignKey === 'string' && to.primaryKeyColumnNames.length > 1) {
            throw new Error(`Has to relationship (${as}) from ${this.tableName} to ${to.tableName} requires a
            foreign key map because ${to.tableName} has a composite primary key.`);
        }
        const foreignKeyMap = typeof foreignKey === 'string' ?
            { [to.primaryKeyColumnNames[0]]: foreignKey } :
            foreignKey;
        const assocation = new assocations_1.HasOneAssociation(to, foreignKeyMap);
        this._associate(as, assocation);
    }
    static belongsTo({ to, as, foreignKey }) {
        if (!to || !(to.prototype instanceof Model)) {
            throw new Error(`Belongs to many relationship: ${as} from model: ${this.tableName} could
            not be established because the 'to' model is not defined, or is not a model.`);
        }
        if (typeof foreignKey === 'string' && to.primaryKeyColumnNames.length > 1) {
            throw new Error(`Belongs to relationship (${as}) from ${this.tableName} to ${to.tableName} requires a
            foreign key map because ${to.tableName} has a composite primary key.`);
        }
        const foreignKeyMap = typeof foreignKey === 'string' ?
            { [foreignKey]: to.primaryKeyColumnNames[0] } :
            foreignKey;
        const assocation = new assocations_1.BelongsToAssociation(to, foreignKeyMap);
        this._associate(as, assocation);
    }
    static _associate(as, association) {
        this.associations[as] = association;
    }
}
exports.Model = Model;
Model.associations = {};
//# sourceMappingURL=model.js.map