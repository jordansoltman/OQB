import knex = require('knex');
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import hydration from 'nesthydrationjs';
import { arrayIfNot } from '../util';
import { Validator } from '../validator';
import { IValidationErrors } from '../validator/errors';
import { Association, BelongsToAssociation, BelongsToManyAssociation, HasManyAssocation, HasOneAssociation } from './assocations';
import { DataType } from './constant';
import { OQB } from './index'; // CIRCULAR DEPENDENCY
import { QueryInterface } from './query_interface';
// tslint:disable-next-line:max-line-length
import { ForeignKey, Hook, IColumn, IColumnDefinitions, IDatabaseData, IDeleteOptions, IInsertOptions, IModelOptions, IPrimaryKeyPairs, ISelectOptions, IUpdateOptions, IWhere, PrimaryKey } from './types';

const nh = hydration();

// nh.registerType(DataType.BOOLEAN, (value) => {
//     console.log(value);
//     return value;
// });

// nh.registerType(DataType.DATETIME, (value) => {
//     console.log(value);
//     return value;
// });

export class Model {

    public static get queryInterface(): QueryInterface {
        return this.orm.queryInterface;
    }

    public static get knex(): knex {
        return this.orm.knex;
    }

    public static tableName: string;
    public static columns: {
        [name: string]: IColumn
    };
    public static columnNames: string[];
    public static primaryKeyColumnNames: string[];
    public static orm: OQB;
    public static associations: { [key: string]: Association } = {};
    public static softDeletes: boolean;
    public static timeStamps: boolean;
    public static hooks: Hook[];

    // Overridden by sub methods
    // tslint:disable-next-line: no-empty
    public static associate() { }

    // tslint:disable-next-line: no-shadowed-variable
    public static init(orm: OQB, name: string, columns: IColumnDefinitions, options: IModelOptions) {
        this.orm = orm;
        const defaultModelOptions: IModelOptions = {
            softDeletes: false,
            timeStamps: true
        };

        const modelOptions = Object.assign({}, defaultModelOptions, options);

        // Add the additional optional columns
        if (modelOptions.timeStamps) {
            columns.created_at = { type: DataType.DATETIME };
            columns.updated_at = { type: DataType.DATETIME };
        }

        if (modelOptions.softDeletes) {
            columns.deleted_at = { type: DataType.DATETIME };
        }

        const columnObjects: {
            [name: string]: IColumn
        } = {};

        for (const [name, columnOrType] of Object.entries(columns)) {
            const column = typeof columnOrType === 'string' ? { type: columnOrType } : columnOrType;
            columnObjects[name] = {
                name,
                ...column,
                primary: column.primary === true,
                type: column.type ? column.type : DataType.STRING // Default data type is string for a column
            };
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
        this.hooks = arrayIfNot(modelOptions.hooks);

        orm.models[this.tableName] = this;
    }

    // FIXME: we really don't want a validator being built every single time. It should really cached.
    public static validate(
        data: IDatabaseData,
        group?: string | string[],
        options?: { properties?: string[] }): Promise<null | IValidationErrors> {
        return this.validator.validate(data, group, options);
    }

    public static convertValuesForDatatabase(values: IDatabaseData): IDatabaseData {

        const convertedValues = _.cloneDeep(values);

        for (const [key, value] of Object.entries(convertedValues)) {
            const column = this.columns[key];
            if (column && column.type) {
                switch (column.type) {
                    // FIXME: Do we need to consider other types?
                    case DataType.DATETIME:
                    case DataType.DATE:
                        if (typeof value === 'string') {
                            convertedValues[key] = DateTime.fromISO(value).toJSDate();
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
    public static async insert(values: IDatabaseData | IDatabaseData[], options: IInsertOptions = {}): Promise<any> {

        if (options.skipValidation !== false) {
            // TODO: validate here!
        }

        const convertedValues = arrayIfNot(values).map((value) => this.convertValuesForDatatabase(value));
        const insertValues: IDatabaseData[] = [];
        for (const value of convertedValues) {
            if (this.timeStamps) {
                insertValues.push({
                    created_at: this.knex.fn.now(),
                    updated_at: this.knex.fn.now(),
                    ...value
                });
            } else {
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
        if (Array.isArray(values)) { return null; }

        // Determine if any of the primary keys were passed as values. This means that we aren't
        // taking advantage of auto increment. I THINK!!! - verify?
        const includedPrimaryKeys = _.intersection(Object.keys(values), this.primaryKeyColumnNames);

        if (includedPrimaryKeys.length > 0) {
            return _.pick(values, includedPrimaryKeys);
            // If a primary key wasn't provided, we can assume it must be an auto-incrementing id
        } else if (this.primaryKeyColumnNames.length === 1 && Array.isArray(result) && result.length === 1) {
            return { [this.primaryKeyColumnNames[0]]: result[0] };
        }

        // We shouldn't get here...
        // FIXME: think about this some more.
        return null;

    }

    public static async update(values: IDatabaseData, options: IUpdateOptions = {}) {
        if (this.timeStamps && options.silent !== true) {
            values.updated_at = this.knex.fn.now();
        }

        // const hookedValues = this.runHooks(values);

        return await this.queryInterface.update(this, values, options);
    }

    public static async delete(options: IDeleteOptions = {}): Promise<number> {
        // If this is a soft deleting model and the delete isn't being overridden then
        // update the deleted_at timestamp instead of actually removing the data
        if (this.softDeletes && options.overrideSoftDelete !== true) {
            const deletedAt = options.deleteTime ? options.deleteTime : this.knex.fn.now();
            return await this.update({ deleted_at: deletedAt }, { ...options, silent: true });
        } else {
            return await this.queryInterface.delete(this, options);
        }
    }

    public static async findOne(options: ISelectOptions = {}): Promise<any | null> {

        options.limit = 1;

        const [query, , definition] = this.queryInterface.select(this, options);
        const queryResult = await query;

        return nh.nest(queryResult, definition);

    }

    public static async findOneById(key: PrimaryKey, options: ISelectOptions = {}): Promise<any | null> {

        // TODO: do we need to clone options

        // Primary key can be a string or number if the table only has one key. If it's a composite key
        // then it'll need multiple keys.
        if (this.primaryKeyColumnNames.length > 1 && (typeof key === 'string' || typeof key === 'number')) {
            throw new Error('This table has a composite key. Primary key must be passed as key/value pairs');
        }

        let primaryKeys: IPrimaryKeyPairs;

        if (typeof key === 'string' || typeof key === 'number') {
            primaryKeys = {
                [this.primaryKeyColumnNames[0]]: key
            };
        } else {
            primaryKeys = key;
        }

        const whereKeys: IWhere[] = [];
        // This has to be moved into thions clause
        for (const [primaryKey, value] of Object.entries(primaryKeys)) {
            whereKeys.push({ eq: [primaryKey, value] });
        }

        if (options.where) {
            options.where = {
                and: [options.where, ...whereKeys]
            };
        } else {
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
    public static async findAll(options: ISelectOptions = {}): Promise<[any, number]> {

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
    public static async count(options: ISelectOptions = {}): Promise<number> {
        // FIXME: this is innefficient because it builds a query that isn't used.
        const [, countQuery] = this.queryInterface.select(this, options);
        const count = await countQuery;
        return count[0].count;
    }

    protected static configureValidator(validator: Validator) { }

    protected static get validator(): Validator {
        const validator = new Validator(this.orm);
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
    protected static hasMany({ to, as, foreignKey }: { to: typeof Model; as: string; foreignKey: ForeignKey; }) {

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

        const association = new HasManyAssocation(to, foreignKeyMap);
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
    protected static belongsToMany(
        { to, toKey, through, fromKey, as }:
            {
                to: typeof Model;
                toKey: ForeignKey;
                through: typeof Model;
                fromKey: ForeignKey;
                as: string;
            }) {

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

        const assocation = new BelongsToManyAssociation(to, through, fromKeyMap, toKeyMap);
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
    protected static hasOne({ to, as, foreignKey }: { to: typeof Model; as: string; foreignKey: ForeignKey; }) {

        if (!to || !(to.prototype instanceof Model)) {
            throw new Error(`Has one many relationship: ${as} from model: ${this.tableName} could
            not be established because the 'to' model is not defined, or is not a model.`);
        }

        if (typeof foreignKey === 'string' && to.primaryKeyColumnNames.length > 1) {
            throw new Error(`Has one relationship (${as}) from ${this.tableName} to ${to.tableName} requires a
            foreign key map because ${to.tableName} has a composite primary key.`);
        }

        const foreignKeyMap = typeof foreignKey === 'string' ?
            { [this.primaryKeyColumnNames[0]]: foreignKey  } :
            foreignKey;

        const assocation = new HasOneAssociation(to, foreignKeyMap);
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
    protected static belongsTo({ to, as, foreignKey }: { to: typeof Model; as: string; foreignKey: ForeignKey; }) {

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

        const assocation = new BelongsToAssociation(to, foreignKeyMap);
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

    private static _associate(as: string, association: Association) {
        this.associations[as] = association;
    }
}
