import knex = require('knex');
import { Validator } from '../validator';
import { IValidationErrors } from '../validator/errors';
import { Association } from './assocations';
import { Orm } from './index';
import { QueryInterface } from './query_interface';
import { ForeignKey, Hook, IColumn, IColumnDefinitions, IDatabaseData, IDeleteOptions, IInsertOptions, IModelOptions, ISelectOptions, IUpdateOptions, PrimaryKey } from './types';
export declare class Model {
    static readonly queryInterface: QueryInterface;
    static readonly knex: knex;
    static tableName: string;
    static columns: {
        [name: string]: IColumn;
    };
    static columnNames: string[];
    static primaryKeyColumnNames: string[];
    static orm: Orm;
    static associations: {
        [key: string]: Association;
    };
    static softDeletes: boolean;
    static timeStamps: boolean;
    static hooks: Hook[];
    static associate(): void;
    static init(orm: Orm, name: string, columns: IColumnDefinitions, options: IModelOptions): void;
    static validate(data: IDatabaseData, group?: string | string[], options?: {
        properties?: string[];
    }): Promise<null | IValidationErrors>;
    static convertValuesForDatatabase(values: IDatabaseData): IDatabaseData;
    static insert(values: IDatabaseData | IDatabaseData[], options?: IInsertOptions): Promise<any>;
    static update(values: IDatabaseData, options?: IUpdateOptions): Promise<any>;
    static delete(options?: IDeleteOptions): Promise<number>;
    static findOne(options?: ISelectOptions): Promise<any | null>;
    static findOneById(key: PrimaryKey, options?: ISelectOptions): Promise<any | null>;
    static findAll(options?: ISelectOptions): Promise<[any, number]>;
    static count(options?: ISelectOptions): Promise<number>;
    protected static configureValidator(validator: Validator): void;
    protected static readonly validator: Validator;
    protected static hasMany({ to, as, foreignKey }: {
        to: typeof Model;
        as: string;
        foreignKey: ForeignKey;
    }): void;
    protected static belongsToMany({ to, toKey, through, fromKey, as }: {
        to: typeof Model;
        toKey: ForeignKey;
        through: typeof Model;
        fromKey: ForeignKey;
        as: string;
    }): void;
    protected static hasOne({ to, as, foreignKey }: {
        to: typeof Model;
        as: string;
        foreignKey: ForeignKey;
    }): void;
    protected static belongsTo({ to, as, foreignKey }: {
        to: typeof Model;
        as: string;
        foreignKey: ForeignKey;
    }): void;
    private static _associate;
}
