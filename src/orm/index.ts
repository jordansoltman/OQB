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

export class OQB {

    public models: IModels;
    private _queryInterface: QueryInterface;
    private _knex: knex;

    constructor(knexConfig: knex.Config) {
        this.models = {};
        this._knex = knex(knexConfig);
        this._queryInterface = new QueryInterface(this._knex);
    }

    public get queryInterface() {
        return this._queryInterface;
    }

    public get knex() {
        return this._knex;
    }

    public transaction(transactionWrapper: (transaction: knex.Transaction) => Promise<any>) {
        return this._knex.transaction((transactionScope) => {
            return transactionWrapper(transactionScope);
        });
    }

    public defineModel(tableName: string, columns: IColumnDefinitions, options: IModelOptions): typeof Model {
        const model = class extends Model {};
        model.init(this, tableName, columns, options);
        return model;
    }

    public associateAllModels() {
        const keys = Object.keys(this.models);
        keys.forEach((key) => {
            this.models[key].associate();
        });
    }
}

export * from './model';
export { SortDirection } from './types'