import knexLib from 'knex';
import { Model } from './model';
import { IDatabaseData, IDeleteOptions, IInsertOptions, ISelectOptions, IUpdateOptions } from './types';
export declare class QueryInterface {
    private knex;
    constructor(knex: knexLib);
    insert(model: typeof Model, values: IDatabaseData | IDatabaseData[], options: IInsertOptions): knexLib.QueryBuilder;
    update(model: typeof Model, values: IDatabaseData, options: IUpdateOptions): knexLib.QueryBuilder<any, any>;
    delete(model: typeof Model, options: IDeleteOptions): knexLib.QueryBuilder<any, any>;
    /**
     * Builds a select query with the given model and optoins
     *
     * @param {typeof Model} rootModel The root model to base the quer off of
     * @param {ISelectOptions} [options] Select options to use to build the query
     * @returns {[knexLib.QueryBuilder, knexLib.QueryBuilder, any]} Returns the main query, a count query,
     * and a definition
     */
    select(rootModel: typeof Model, options?: ISelectOptions): [knexLib.QueryBuilder, knexLib.QueryBuilder, any];
    /**
     * Builds a join tree of IJoinTreeNodes based on the given root model and options.
     *
     * @private
     * @param {typeof Model} rootModel The model to use as the root
     * @param {IStandardizedSelectOptions} options Select options for the query.
     * @returns {[IJoinTreeNode, any, IJoinTreeMeta]} Returns the join tree node, a definition object for use
     * with NestHydration, and a meta object that includes additional information about the join tree.
     * @memberof QueryInterface
     */
    private buildSelectJoinTree;
    /**
     * HELPER METHOD
     * Recursively builds a join tree of join tree nodes that represent a models
     * associations to other models
     * @param includeOptions The includes
     * @param node The inital root node
     */
    private _buildSelectJoinTree;
    private buildSelectQuery;
    private buildWhereQuery;
    private buildSelectSubQuery;
    private setSelectQueryLimitOffset;
    private setSelectQueryOrder;
    /**
     * Includes can be defined with just string names as their associations. This
     * creates a include structure where every include item is an array of
     * objects
     * This function returns a standard include options object.
     * @param include An include that should be expanded
     */
    private standardizeSelectInclude;
    /**
     * HELPER FUNCTION
     * Standardizes select includes recursively.
     */
    private _standardizeSelectInclude;
    /**
     * Given a set of select options, this method returns a set of select options with the
     * 'includeInSubquery' flag set for every relation given in association sets.
     *
     * @private
     * @param {IStandardizedSelectOptions} selectOptions The options
     * @param {string[][]} associationSets Associations sets to search for
     * @returns {IStandardizedSelectOptions} A new set of options with the includeInSubquery flags set
     * @memberof QueryInterface
     */
    private addIncludeInSubqueryOptionToRelations;
    /**
     * This method searches a where function for columns that are declared as assciative
     * @param where The where function to search.
     */
    private getAssociationsFromWhere;
    /**
     * HELPER FUNCTION
     * Recursively looks for associations in a where clause
     * @param where The where clause to search
     * @param associations Should be initiated as an empty array
     */
    private _getAssociationsFromWhere;
}
