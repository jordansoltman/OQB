import knexLib from 'knex';
import { Model } from './model';
import { IDatabaseData, IDeleteOptions, IInsertOptions, ISelectOptions, IUpdateOptions } from './types';
export declare class QueryInterface {
    private knex;
    constructor(knex: knexLib);
    insert(model: typeof Model, values: IDatabaseData | IDatabaseData[], options: IInsertOptions): knexLib.QueryBuilder;
    update(model: typeof Model, values: IDatabaseData, options: IUpdateOptions): knexLib.QueryBuilder<any, any>;
    delete(model: typeof Model, options: IDeleteOptions): knexLib.QueryBuilder<any, any>;
    select(rootModel: typeof Model, options?: ISelectOptions): [knexLib.QueryBuilder, knexLib.QueryBuilder, any];
    private buildSelectJoinTree;
    private _buildSelectJoinTree;
    private buildSelectQuery;
    private buildWhereQuery;
    private buildSelectSubQuery;
    private setSelectQueryLimitOffset;
    private setSelectQueryOrder;
    private standardizeSelectInclude;
    private _standardizeSelectInclude;
    private addIncludeInSubqueryOptionToRelations;
    private getAssociationsFromWhere;
    private _getAssociationsFromWhere;
}
