import knex, { Raw } from 'knex';
import { IColumnDefinition } from '.';
import { DataType } from './constant';
export declare type ForeignKey = string | IPrimaryKeyPairs;
export declare type SelectInclude = string | ISelectIncludedTableOptions | Array<string | ISelectIncludedTableOptions>;
export declare type Hook = ((data: IDatabaseData) => IDatabaseData) | ((data: IDatabaseData) => Promise<IDatabaseData>);
export declare enum SortDirection {
    ASC = "ASC",
    DESC = "DESC"
}
export interface IRelatedColumnIdentifier {
    relation: string[];
    column: string;
}
export declare type ColumnIdentifier = string | IRelatedColumnIdentifier;
export declare type ColumnValue<T> = [ColumnIdentifier, T];
export declare type Order = ColumnValue<SortDirection>;
export interface IWhere {
    and?: IWhere[];
    or?: IWhere[];
    neq?: ColumnValue<string | number | boolean | Date | Raw>;
    eq?: ColumnValue<string | number | boolean | Date | Raw>;
    like?: ColumnValue<string | number>;
    in?: ColumnValue<Array<string | number | boolean | Date>>;
    gt?: ColumnValue<number | Date | Raw>;
    gte?: ColumnValue<number | Date | Raw>;
    lt?: ColumnValue<number | Date | Raw>;
    lte?: ColumnValue<number | Date | Raw>;
}
interface ISelectTableOptions {
    include?: SelectInclude;
    includeSoftDeleted?: boolean;
    required?: boolean;
    where?: IWhere;
    attributes?: string[];
    excludeAttributes?: string[];
    includeInSubquery?: boolean;
}
export interface ISelectIncludedTableOptions extends ISelectTableOptions {
    association?: string;
    through?: {
        where?: IWhere;
        includeSoftDeleted?: boolean;
    };
}
export interface IDatabaseData {
    [column: string]: any;
}
export interface IInsertOptions {
    log?: boolean;
    transaction?: knex.Transaction;
    skipValidation?: boolean;
}
export interface IUpdateOptions {
    where?: IWhere;
    log?: boolean;
    transaction?: knex.Transaction;
    silent?: boolean;
}
export interface IDeleteOptions {
    where?: IWhere;
    log?: boolean;
    transaction?: knex.Transaction;
    overrideSoftDelete?: boolean;
    deleteTime?: Date;
}
export interface IModelOptions {
    softDeletes?: boolean;
    timeStamps?: boolean;
    hooks?: Hook | Hook[];
}
export interface IColumnDefinitions {
    [key: string]: IColumnDefinition | DataType;
}
export interface ISelectOptions extends ISelectTableOptions {
    limit?: number;
    offset?: number;
    order?: Order[];
    log?: boolean;
    transaction?: knex.Transaction;
}
export interface IPrimaryKeyPairs {
    [key: string]: string | number;
}
export interface IColumn extends IColumnDefinition {
    name: string;
    primary: boolean;
    type: DataType;
}
export declare type PrimaryKey = IPrimaryKeyPairs | string | number;
export {};
