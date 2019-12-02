import knex = require('knex');
import { Validator } from '../validator';
import { IValidationErrors } from '../validator/errors';
import { Association } from './assocations';
import { OQB } from './index';
import { QueryInterface } from './query_interface';
import { ForeignKey, Hook, IColumn, IColumnDefinitions, IDatabaseData, IDeleteOptions, IInsertOptions, IModelOptions, ISelectOptions, IUpdateOptions, PrimaryKey } from './types';
export declare class Model {
    static get queryInterface(): QueryInterface;
    static get knex(): knex;
    static tableName: string;
    static columns: {
        [name: string]: IColumn;
    };
    static columnNames: string[];
    static primaryKeyColumnNames: string[];
    static oqb: OQB;
    static associations: {
        [key: string]: Association;
    };
    static softDeletes: boolean;
    static timeStamps: boolean;
    static hooks: Hook[];
    static associate(): void;
    static init(orm: OQB, name: string, columns: IColumnDefinitions, options: IModelOptions): void;
    static validate(data: IDatabaseData, group?: string | string[], options?: {
        properties?: string[];
    }): Promise<null | IValidationErrors>;
    static convertValuesForDatatabase(values: IDatabaseData): IDatabaseData;
    /**
     * Inserts a single values, or a set of values into the database. If inserting a single value, you will get an
     * object representing the ids of the object you are inserting. If you insert a set of values, you'll just get
     * null as a response.
     * @param values The values to insert
     * @param options Any insert options
     */
    static insert(values: IDatabaseData | IDatabaseData[], options?: IInsertOptions): Promise<any>;
    static update(values: IDatabaseData, options?: IUpdateOptions): Promise<any>;
    static delete(options?: IDeleteOptions): Promise<number>;
    static findOne(options?: ISelectOptions): Promise<any | null>;
    static findOneById(key: PrimaryKey, options?: ISelectOptions): Promise<any | null>;
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
    static findAll(options?: ISelectOptions): Promise<[any, number]>;
    /**
     * Returns a count for the given select options. Ignores limit.
     *
     * @static
     * @param {ISelectOptions} [options={}]
     * @returns {Promise<number>}
     * @memberof Model
     */
    static count(options?: ISelectOptions): Promise<number>;
    protected static configureValidator(validator: Validator): void;
    protected static get validator(): Validator;
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
    protected static hasMany({ to, as, foreignKey }: {
        to: typeof Model;
        as: string;
        foreignKey: ForeignKey;
    }): void;
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
    protected static belongsToMany({ to, toKey, through, fromKey, as }: {
        to: typeof Model;
        toKey: ForeignKey;
        through: typeof Model;
        fromKey: ForeignKey;
        as: string;
    }): void;
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
    protected static hasOne({ to, as, foreignKey }: {
        to: typeof Model;
        as: string;
        foreignKey: ForeignKey;
    }): void;
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
    protected static belongsTo({ to, as, foreignKey }: {
        to: typeof Model;
        as: string;
        foreignKey: ForeignKey;
    }): void;
    private static _associate;
}
