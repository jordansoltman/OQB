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
// nh.registerType(DataType.BOOLEAN, (value) => {
//     console.log(value);
//     return value;
// });
// nh.registerType(DataType.DATETIME, (value) => {
//     console.log(value);
//     return value;
// });
class Model {
    static get queryInterface() {
        return this.orm.queryInterface;
    }
    static get knex() {
        return this.orm.knex;
    }
    // Overridden by sub methods
    // tslint:disable-next-line: no-empty
    static associate() { }
    // tslint:disable-next-line: no-shadowed-variable
    static init(orm, name, columns, options) {
        this.orm = orm;
        const defaultModelOptions = {
            softDeletes: false,
            timeStamps: true
        };
        const modelOptions = Object.assign({}, defaultModelOptions, options);
        // Add the additional optional columns
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
            columnObjects[name] = Object.assign(Object.assign({ name }, column), { primary: column.primary === true, type: column.type ? column.type : constant_1.DataType.STRING // Default data type is string for a column
             });
        }
        const primaryKeyColumnNames = Object.values(columnObjects)
            .filter((column) => column.primary)
            .map((column) => column.name);
        if (primaryKeyColumnNames.length < 1) {
            throw new Error(`Table ${name} needs at least one column identified as a primary key.`);
        }
        // Build the actual model
        // const model = class extends Model { };
        this.orm = orm;
        this.tableName = name;
        this.columns = columnObjects;
        this.columnNames = Object.keys(columns);
        this.associations = {};
        this.primaryKeyColumnNames = primaryKeyColumnNames;
        this.softDeletes = modelOptions.softDeletes;
        this.timeStamps = modelOptions.timeStamps;
        // FIXME: implement this properly
        this.hooks = util_1.arrayIfNot(modelOptions.hooks);
        orm.models[this.tableName] = this;
    }
    // FIXME: we really don't want a validator being built every single time. It should really cached.
    static validate(data, group, options) {
        return this.validator.validate(data, group, options);
    }
    static convertValuesForDatatabase(values) {
        const convertedValues = _.cloneDeep(values);
        for (const [key, value] of Object.entries(convertedValues)) {
            const column = this.columns[key];
            if (column && column.type) {
                switch (column.type) {
                    // FIXME: Do we need to consider other types?
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
    /**
     * Inserts a single values, or a set of values into the database. If inserting a single value, you will get an
     * object representing the ids of the object you are inserting. If you insert a set of values, you'll just get
     * null as a response.
     * @param values The values to insert
     * @param options Any insert options
     */
    static async insert(values, options = {}) {
        if (options.skipValidation !== false) {
            // TODO: validate here!
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
        // const hookedPromises = insertValues.map(async (values) => await this.runHooks(values));
        // const resolvedPromises = Promise.all(hookedPromises);
        const result = await this.queryInterface.insert(this, insertValues, options);
        // We have to do some magic to get the right primary key returned automatically.
        // If the id was passed in via the values, we'll just capture that and return it,
        // but if there was no id passed, it is assumed to be autoincrementing and thus
        // should be in the result.
        // If values are passed in as an array, there is nothing we can do.
        if (Array.isArray(values)) {
            return null;
        }
        // Determine if any of the primary keys were passed as values. This means that we aren't
        // taking advantage of auto increment. I THINK!!! - verify?
        const includedPrimaryKeys = _.intersection(Object.keys(values), this.primaryKeyColumnNames);
        if (includedPrimaryKeys.length > 0) {
            return _.pick(values, includedPrimaryKeys);
            // If a primary key wasn't provided, we can assume it must be an auto-incrementing id
        }
        else if (this.primaryKeyColumnNames.length === 1 && Array.isArray(result) && result.length === 1) {
            return { [this.primaryKeyColumnNames[0]]: result[0] };
        }
        // We shouldn't get here...
        // FIXME: think about this some more.
        return null;
    }
    static async update(values, options = {}) {
        if (this.timeStamps && options.silent !== true) {
            values.updated_at = this.knex.fn.now();
        }
        // const hookedValues = this.runHooks(values);
        return await this.queryInterface.update(this, values, options);
    }
    static async delete(options = {}) {
        // If this is a soft deleting model and the delete isn't being overridden then
        // update the deleted_at timestamp instead of actually removing the data
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
        // TODO: do we need to clone options
        // Primary key can be a string or number if the table only has one key. If it's a composite key
        // then it'll need multiple keys.
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
        // This has to be moved into thions clause
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
    /**
     * Finds all of the related models with the given [[ISelectOptions]].
     *
     * @static
     * @param {ISelectOptions} [options={}] The options to apply to the query.
     * @returns {Promise<[any, number]>} A promise array where the first element are any
     * results that were found and the second element is the total count of all of the
     * records __not__ including the limit.
     * @memberof Model
     */
    static async findAll(options = {}) {
        const [query, countQuery, definition] = this.queryInterface.select(this, options);
        const [rawRows, rawCount] = await Promise.all([query, countQuery]);
        const count = rawCount[0].count;
        return [nh.nest(rawRows, [definition]), count];
    }
    /**
     * Returns a count for the given select options. Ignores limit.
     *
     * @static
     * @param {ISelectOptions} [options={}]
     * @returns {Promise<number>}
     * @memberof Model
     */
    static async count(options = {}) {
        // FIXME: this is innefficient because it builds a query that isn't used.
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
    /**
     * Creates a has many relationship with the given model.
     *
     * @protected
     * @static
     * @param {typeof Model} to The model to associate with
     * @param {string} as The name of the association
     * @param {ForeignKey} foreignKey Either a string specifying the foreign key column in the 'to' model that
     * references the calling model primary key, or a foreign key map { callingModelId: 'foreignModelId', ... }
     * @memberof Model
     */
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
    /**
     *
     * Creates a belongs to many relationship with the given model.
     *
     * +---------+     +-------------+     +---------+
     * |         |     |             |     |         |
     * |  from   |     |   through   |     |   to    |
     * |  Model  |     |    Model    |     |  Model  |
     * |         |     |             |     |         |
     * +---+-----+     +-----+--+----+     +----+----+
     *     |                 |  |               |
     *     |  +-----------+  |  |   +---------+ |
     *     +--+  fromKey  +--+  +---+  toKey  +-+
     *        +-----------+         +---------+
     *
     * toKey can be a string specifying the primary key on the through model that references the 'to' model.
     * If the 'to' model has a composite key the key must be passed as a map:
     * {
     *    <through model key>: <to model key>,
     *    ...
     * }
     *
     * fromKey can be a string specifying the primary key on the through model that references the 'from' model.
     * If the 'from' model has a composite key, the key must be passed as a map:
     * {
     *     <from model key>: <through model key>,
     *     ...
     * }
     *
     * @param to
     * @param foreignKey
     * @param through
     * @param throughForeignKey
     * @param as
     */
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
    /**
     * Creates a has one realtionship with the given model.
     *
     * @protected
     * @static
     * @param {typeof Model} to Model to create a relationship with
     * @param {string} as Name of the relationship
     * @param {ForeignKey} foreignKey Either a string specifying the foreign key column in the calling model
     * that relates to the primary key of the 'to' model, or a foreign kep map { foreignModelId: 'callingModelId', ... }
     * @memberof Model
     */
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
    /**
     * Creates a belongs to realtionship with the given model.
     *
     * @protected
     * @static
     * @param {typeof Model} to Model to create a relationship with
     * @param {string} as Name of the relationship
     * @param {ForeignKey} foreignKey Either a string specifying the foreign key column in the calling model
     * that relates to the primary key of the 'to' model, or a foreign kep map { foreignModelId: 'callingModelId', ... }
     * @memberof Model
     */
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
    // private static async runHooks(values: IDatabaseData) {
    //     let result = values;
    //     if (this.hooks) {
    //         for (const hook of this.hooks) {
    //             result = await hook(result);
    //         }
    //     }
    //     return result;
    // }
    static _associate(as, association) {
        this.associations[as] = association;
    }
}
exports.Model = Model;
Model.associations = {};
//# sourceMappingURL=model.js.map