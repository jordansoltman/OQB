import knex from 'knex';
import { DataType } from './constant';
import { Model } from './model';
import { QueryInterface } from './query_interface';
import { IColumnDefinitions, IModelOptions } from './types';
export { DataType } from './constant';
export interface IColumnDefinition {
    primary?: boolean;
    required?: boolean;
    type?: DataType;
    nullable?: Boolean;
}
export interface IModels {
    [key: string]: typeof Model;
}
export declare class OQB {
    models: IModels;
    private _queryInterface;
    private _knex;
    constructor(knexConfig: knex.Config);
    get queryInterface(): QueryInterface;
    get knex(): knex<any, any[]>;
    transaction(transactionWrapper: (transaction: knex.Transaction) => Promise<any>): Promise<any>;
    defineModel(tableName: string, columns: IColumnDefinitions, options: IModelOptions): typeof Model;
    associateAllModels(): void;
}
export * from './model';
export { SortDirection } from './types';
