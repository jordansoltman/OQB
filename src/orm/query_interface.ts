
import knexLib from 'knex';
import _ from 'lodash';
import { singular } from 'pluralize';
import { arrayIfNot } from '../util';
import { BelongsToAssociation, BelongsToManyAssociation, HasManyAssocation, HasOneAssociation } from './assocations';
import { Model } from './model';
// tslint:disable-next-line:max-line-length
import { ColumnValue, IDatabaseData, IDeleteOptions, IInsertOptions, IPrimaryKeyPairs, IRelatedColumnIdentifier, ISelectIncludedTableOptions, ISelectOptions, IUpdateOptions, IWhere, Order, SelectInclude } from './types';

/**
 * Defines the node structure used for the join tree.
 */
interface IJoinTreeNode {
    /**
     * The model that the node refers to.
     */
    model: typeof Model;

    /**
     * A string alias that this table will be refered to in queries.
     */
    tableAlias: string;

    /**
     * The parent node if this is an included association. Null if this
     * is a root node.
     */
    parent: null | IJoinTreeNode;

    /**
     * A map of keys used to associate this model to the parent model.
     */
    keyMap?: IPrimaryKeyPairs;

    /**
     * True if this model is associated by a hasMany or belongsToMany.
     */
    multiAssociation?: boolean;

    /**
     * The models that this node is associated with.
     */
    children?: IJoinTreeNode[];

    /**
     * If this model should ignore soft deletes. This means that a where clause
     * should not be added for the deleted_at timestamp if soft deletes are
     * enabled.
     */
    includeSoftDeleted?: boolean;

    /**
     * An optional where clause to add onto this query.
     */
    where?: IWhere;

    /**
     * True if this association should be required for the row to be returned.
     * If set true, this essentially means this model should be joined with
     * an inner join instead of a left join.
     */
    required?: boolean;

    /**
     * Flag to indicate if this model should be included in the subquery. The subquery
     * is generated if there is a limit set, and the query has an multi-association.
     *
     * If the model has a where clause, or an order clause, this table will be needed
     * in the subquery as well.
     */
    includeInSubquery?: boolean;
}

/**
 * Meta information for the join tree that is not table specific.
 */
interface IJoinTreeMeta {
    /**
     * True if the join tree has a multi-association somewhere in the tree. A multi-association
     * is a hasMany or belongsToMany.
     */
    hasMultiAssociation: boolean;
}

/**
 * This is used internally by the ORM and defines
 * a more rigid structure for the include options.
 */
interface IStandardizedSelectIncludedTableOptions extends ISelectIncludedTableOptions {
    include?: {
        [key: string]: IStandardizedSelectIncludedTableOptions
    };
}

/**
 * This is used internally by the ORM and defines
 * a more rigid structure for the include options.
 */
interface IStandardizedSelectOptions extends ISelectOptions {
    include?: {
        [key: string]: IStandardizedSelectIncludedTableOptions
    };
}

const TABLE_JOIN_STRING = '->';

export class QueryInterface {

    private knex: knexLib;

    constructor(knex: knexLib) {
        this.knex = knex;
    }

    public insert(
        model: typeof Model,
        values: IDatabaseData | IDatabaseData[],
        options: IInsertOptions)
        : knexLib.QueryBuilder
    {
        const tableName = model.tableName;

        const query = this.knex(tableName).insert(values);
        if (options.log) {
            // tslint:disable-next-line
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return query;
    }

    public update(model: typeof Model, values: IDatabaseData, options: IUpdateOptions): knexLib.QueryBuilder<any, any> {
        const tableName = model.tableName;
        const query = this.knex(tableName).update(values);
        if (options.where) {
            this.buildWhereQuery(query, tableName, options.where);
        }
        if (options.log) {
            // tslint:disable-next-line
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return query;
    }

    public delete(model: typeof Model, options: IDeleteOptions): knexLib.QueryBuilder<any, any> {
        const tableName = model.tableName;
        const query = this.knex(tableName).delete();
        if (options.where) {
            this.buildWhereQuery(query, tableName, options.where);
        }
        if (options.log) {
            // tslint:disable-next-line
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return query;
    }

    /**
     * Builds a select query with the given model and optoins
     *
     * @param {typeof Model} rootModel The root model to base the quer off of
     * @param {ISelectOptions} [options] Select options to use to build the query
     * @returns {[knexLib.QueryBuilder, knexLib.QueryBuilder, any]} Returns the main query, a count query,
     * and a definition
     */
    public select(
        rootModel: typeof Model,
        options?: ISelectOptions)
        : [knexLib.QueryBuilder, knexLib.QueryBuilder, any]
    {

        const tableName = rootModel.tableName;

        const selectOptions = {...options};

        const orders = selectOptions.order ? selectOptions.order : [];

        selectOptions.include =
            this.standardizeSelectInclude(selectOptions.include);

        let standardizedOptions = selectOptions as IStandardizedSelectOptions;

        // If a complex where statement exists we need to load that table into the subquery
        // so that we can run the query against it
        const whereAssociations = selectOptions.where ? this.getAssociationsFromWhere(selectOptions.where) : [];
        // get the associations that need to be preloaded from the orders
        const orderAssociations = orders
            .filter((order) => typeof order[0] !== 'string')
            .map((order) => (order[0] as IRelatedColumnIdentifier).relation) as string[][];

        standardizedOptions = this.addIncludeInSubqueryOptionToRelations(
            standardizedOptions,
            [...orderAssociations, ...whereAssociations]
        );

        const [joinTree, definition, meta] = this.buildSelectJoinTree(rootModel, standardizedOptions);

        const queryBuilder = this;

        // Build the count query.
        const countQuery = this.knex.queryBuilder().count('* as count').from(tableName);
        if (joinTree.required || meta.hasMultiAssociation) {
            queryBuilder.buildSelectSubQuery(countQuery, joinTree, true);
        } else {
            queryBuilder.buildSelectQuery(countQuery, joinTree);
        }

        // Build the main query
        const query = this.knex.queryBuilder().options({ nestTables: '.' });

        // Determine if we need to build a sub query as well
        if (joinTree.required || (standardizedOptions.limit && meta.hasMultiAssociation)) {
            query.from(function () {
                const subQuery = this.select(`${tableName}.*`).from(tableName).as(tableName);
                queryBuilder.buildSelectSubQuery(subQuery, joinTree, true);
                queryBuilder.setSelectQueryLimitOffset(subQuery, standardizedOptions);
                queryBuilder.setSelectQueryOrder(rootModel, subQuery, orders);
            });

        } else {
            query.select().from(tableName);
            // We don't always set the limit because if we are pulling many records we don't want to limit
            // them in the outer scope, so handle it
            queryBuilder.setSelectQueryLimitOffset(query, standardizedOptions);
        }

        this.setSelectQueryOrder(rootModel, query, orders);
        this.buildSelectQuery(query, joinTree);

        if (options.log === true) {
            // tslint:disable-next-line
            console.log(query.toString());
        }

        if (options.transaction) {
            query.transacting(options.transaction);
        }

        return [query, countQuery, definition];
    }

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
    private buildSelectJoinTree(
        rootModel: typeof Model,
        options: IStandardizedSelectOptions)
        : [IJoinTreeNode, any, IJoinTreeMeta]
    {

        const rootTableName = rootModel.tableName;
        // We have to first build the root node for the base table.
        const rootNode: IJoinTreeNode = {
            model: rootModel,
            parent: null,
            tableAlias: rootTableName
        };

        // Options contains a lot of the same properties as include options but is
        // not the same so we must move them over manually.
        const includeOptions: ISelectIncludedTableOptions = {
            include: options.include,
            where: options.where,
            includeSoftDeleted: options.includeSoftDeleted,
            attributes: options.attributes,
            excludeAttributes: options.excludeAttributes
        };
        const definition = {};
        const meta: IJoinTreeMeta = {
            hasMultiAssociation: false
        };

        // Call the recursive _buildJoinTree() method to complete the tree.
        this._buildSelectJoinTree(includeOptions, rootNode, definition, [rootTableName], meta);
        return [rootNode, definition, meta];
    }

    /**
     * HELPER METHOD
     * Recursively builds a join tree of join tree nodes that represent a models
     * associations to other models
     * @param includeOptions The includes
     * @param node The inital root node
     */
    private _buildSelectJoinTree(
        include: SelectInclude,
        node: IJoinTreeNode,
        definition: any,
        path: string[],
        meta: IJoinTreeMeta)
    {

        const rootDefinition = Array.isArray(definition) ? definition[0] : definition;

        let columnNames = node.model.columnNames;

        const primaryKeyColumnNames = node.model.primaryKeyColumnNames;

        // Handle the attributes
        if (typeof include === 'object') {
            const includeOptions = include as ISelectIncludedTableOptions;
            if (includeOptions.attributes) {
                const allAttributes = [...primaryKeyColumnNames, ...includeOptions.attributes];
                columnNames = _.intersection(_.uniq(allAttributes), columnNames);
            } else if (includeOptions.excludeAttributes) {
                const difference = _.difference(columnNames, includeOptions.excludeAttributes);
                columnNames = _.uniq([...difference, ...primaryKeyColumnNames]);
            }
        }

        // It's possible that the root definition is null if an attributes or excludeAttributes
        // settings further up the chain stopped definitions from being established.
        if (rootDefinition) {
            // Add each column into the definition
            for (const columnName of columnNames) {
                const column = node.model.columns[columnName];
                rootDefinition[columnName] = {
                    column: node.tableAlias + '.' + columnName,
                    id: primaryKeyColumnNames.includes(columnName),
                    type: column.type
                };
            }
        }

        if (typeof include === 'object') {

            const includeOptions = include as ISelectIncludedTableOptions;
            node.where = includeOptions.where;
            node.includeSoftDeleted = includeOptions.includeSoftDeleted === true;
            node.required = includeOptions.required === true || includeOptions.where !== undefined;
            node.includeInSubquery = includeOptions.includeInSubquery === true;

            // If this node is required, or needed by order by definition every node above it
            // in the tree is required/is needed as well
            if (node.required || node.includeInSubquery) {
                let nodePtr = node;
                while (nodePtr !== null) {
                    if (node.required) {
                        nodePtr.required = true;
                    }
                    if (node.includeInSubquery) {
                        nodePtr.includeInSubquery = true;
                    }
                    nodePtr = nodePtr.parent;
                }
            }

            if (includeOptions.include) {

                node.children = [];

                for (const childInclude of Object.values(includeOptions.include) as ISelectIncludedTableOptions[]) {

                    const assocationName = childInclude.association;

                    let throughOptions: ISelectIncludedTableOptions = {};
                    if (childInclude.through) {
                        throughOptions = childInclude.through;
                    }

                    const rootPath = [...path];

                    const assocation = node.model.associations[assocationName];

                    if (!assocation) {
                        throw new Error(`Cannot find association: ${assocationName} on model: ${node.model.tableName}`);
                    }

                    if (assocation.multiAssociation) {
                        meta.hasMultiAssociation = true;
                    }

                    let currentNode = node;
                    let nextDefinition: any = {};
                    const throughDefinition: any = {};

                    if (assocation instanceof BelongsToManyAssociation) {

                        rootPath.push('through+' + assocationName);

                        const tableAlias = rootPath.join(TABLE_JOIN_STRING);

                        const throughNode: IJoinTreeNode = {
                            parent: currentNode,
                            model: assocation.through,
                            includeSoftDeleted: throughOptions.includeSoftDeleted === true,
                            multiAssociation: true,
                            keyMap: assocation.fromKeyMap,
                            where: throughOptions.where,
                            required: throughOptions.where !== undefined,
                            children: [],
                            tableAlias
                        };
                        currentNode.children.push(throughNode);
                        currentNode = throughNode;

                        // If this node is required, by definition every node above it
                        // in the tree is required as well
                        // ! this is redundant code.. but I'm not sure how to move it
                        if (currentNode.required) {
                            let nodePtr = node;
                            while (nodePtr !== null) {
                                nodePtr.required = true;
                                nodePtr = nodePtr.parent;
                            }
                        }

                        assocation.through.columnNames.forEach((columnName) => {
                            // tslint:disable-next-line
                            throughDefinition[columnName] = assocation.through.primaryKeyColumnNames.includes(columnName) ?
                                { column: tableAlias + '.' + columnName, id: true } :
                                tableAlias + '.' + columnName;
                        });

                    }

                    // Check if there is a root definition, if attributes which should be included
                    // have been defined, and if so that this association is in that list, or that
                    // there is a list of attributes that should be excluded and that this isn't on that
                    // list.
                    // In essence, the attributes/excludeAttributes property might exclude this from the
                    // actual results.
                    if (rootDefinition &&
                        !(includeOptions.attributes &&
                            !includeOptions.attributes.includes(assocationName)) &&
                        !(includeOptions.excludeAttributes &&
                            includeOptions.excludeAttributes.includes(assocationName)))
                    {
                        if (assocation instanceof BelongsToAssociation || assocation instanceof HasOneAssociation) {
                            rootDefinition[assocationName] = nextDefinition;
                        } else if (assocation instanceof HasManyAssocation) {
                            rootDefinition[assocationName] = [nextDefinition];
                        } else {
                            rootDefinition[assocationName] = [throughDefinition];
                            // FIXME: allow for this singluar definition to be specified somewhere...
                            throughDefinition[singular(assocationName)] = nextDefinition;
                        }
                    } else {
                        nextDefinition = null;
                    }

                    rootPath.push(assocationName);

                    const newNode: IJoinTreeNode = {
                        parent: currentNode,
                        model: assocation.to,
                        // Only has many relationships will be multi-associations at this join
                        // Belongs to many is a multi-association on the through table
                        multiAssociation: assocation instanceof HasManyAssocation ? true : false,
                        keyMap: assocation.toKeyMap,
                        tableAlias: rootPath.join(TABLE_JOIN_STRING)
                    };

                    currentNode.children.push(newNode);

                    this._buildSelectJoinTree(childInclude, newNode, nextDefinition, rootPath, meta);

                }
            }
        }
    }

    private buildSelectQuery(
        query: knexLib.QueryBuilder,
        node: IJoinTreeNode)
    {

        if (node.model.softDeletes === true && node.includeSoftDeleted !== true && node.parent === null) {
            query.where(function() {
                this.orWhereNull(`${node.tableAlias}.deleted_at`)
                    .orWhere(`${node.tableAlias}.deleted_at`, '>', knex.fn.now());
            });
        }

        if (node.where) {
            this.buildWhereQuery(query, node.tableAlias, node.where);
        }

        const knex = this.knex;

        if (node.children) {

            for (const childNode of node.children) {
                const joinType = childNode.required ? 'innerJoin' : 'leftJoin';

                const tableName = childNode.model.tableName;

                query[joinType](`${tableName} AS ${childNode.tableAlias}`, function() {
                    for (const [rootColumn, joinColumn] of Object.entries(childNode.keyMap)) {
                        this.andOn(`${node.tableAlias}.${rootColumn}`, `${childNode.tableAlias}.${joinColumn}`);
                    }
                    if (childNode.model.softDeletes && childNode.includeSoftDeleted !== true) {
                        this.andOn(function() {
                            this.orOnNull(`${childNode.tableAlias}.deleted_at`)
                                .orOn(`${childNode.tableAlias}.deleted_at`, '>', knex.fn.now());
                        });
                    }
                });

                this.buildSelectQuery(query, childNode);
            }
        }
    }

    private buildWhereQuery(
        query: knexLib.QueryBuilder<any, any>,
        table: string,
        where: IWhere,
        and: boolean = true)
    {

        const model = this;
        const method = and ? 'andWhere' : 'orWhere';

        function column<T>(comparison: ColumnValue<T>): string {
            if (typeof comparison[0] !== 'string') {
                return [table, ...comparison[0].relation]
                .join(TABLE_JOIN_STRING) + '.' + comparison[0].column;
            } else {
                return table + '.' + comparison[0];
            }
        }

        // TODO: add support for other where types as needed

        if (where.eq) {
            const value = where.eq[1];
            if (value === null) {
                query[and ? 'whereNull' : 'orWhereNull'](column(where.eq));
            } else {
                query[method](column(where.eq), '=', where.eq[1]);
            }
        }

        if (where.neq) {
            const value = where.neq[1];
            if (value === null) {
                query[and ? 'whereNotNull' : 'orWhereNotNull'](column(where.neq));
            } else {
                query[method](column(where.neq), '!=', where.neq[1]);
            }
        }

        if (where.like) {
            query[method](column(where.like), 'like', where.like[1]);
        }

        if (where.in) {
            query[and ? 'whereIn' : 'orWhereIn'](column(where.in), where.in[1]);
        }

        if (where.lt) {
            query[method](column(where.lt), '<', where.lt[1]);
        }

        if (where.lte) {
            query[method](column(where.lte), '<=', where.lte[1]);
        }

        if (where.gt) {
            query[method](column(where.gt), '>', where.gt[1]);
        }

        if (where.gte) {
            query[method](column(where.gte), '>=', where.gte[1]);
        }

        if (where.or) {
            query[method](function() {
                for (const childOr of where.or) {
                    model.buildWhereQuery(this, table, childOr, false);
                }
            });
        }

        if (where.and) {
            query[method](function() {
                for (const childAnd of where.and) {
                    model.buildWhereQuery(this, table, childAnd, true);
                }
            });
        }

    }

    private buildSelectSubQuery(
        query: knexLib.QueryBuilder,
        node: IJoinTreeNode,
        firstMulti: boolean)
    {

        const model = this;
        const knex = this.knex;

        if (node.model.softDeletes === true && node.includeSoftDeleted !== true && node.parent === null) {
            query.where(function() {
                this.orWhereNull(`${node.tableAlias}.deleted_at`)
                    .orWhere(`${node.tableAlias}.deleted_at`, '>', knex.fn.now());
            });
        }
        
        if (node.where) {
            model.buildWhereQuery(query, node.tableAlias, node.where);
        }

        // We only continue to process the children if the current node is required
        if (node.children) {

            for (const childNode of node.children) {

                // We are only joining the required joins
                if (!childNode.required && !childNode.includeInSubquery) { continue; }

                const tableName = childNode.model.tableName;

                // If it's a multi-association and the first one, we treat it differently
                if (childNode.multiAssociation && firstMulti) {
                    query.whereExists((subQuery) => {
                        subQuery.select().from(`${tableName} AS ${childNode.tableAlias}`).where(function() {
                            for (const [rootColumn, joinColumn] of Object.entries(childNode.keyMap)) {
                                // tslint:disable-next-line: max-line-length
                                this.andWhereRaw(`\`${node.tableAlias}\`.\`${rootColumn}\` = \`${childNode.tableAlias}\`.\`${joinColumn}\``);
                            }
                            if (childNode.model.softDeletes && childNode.includeSoftDeleted !== true) {
                                this.where(function() {
                                    this.orWhereNull(`${childNode.tableAlias}.deleted_at`)
                                        .orWhere(`${childNode.tableAlias}.deleted_at`, '>', knex.fn.now());
                                });
                            }
                        })
                        .limit(1);
                        model.buildSelectSubQuery(subQuery, childNode, false);
                    });
                } else {
                    // If it's just needed for order then it is a left join.
                    const joinType = childNode.required ? 'innerJoin' : 'leftJoin';
                    query[joinType](`${tableName} AS ${childNode.tableAlias}`, function() {
                        for (const [rootColumn, joinColumn] of Object.entries(childNode.keyMap)) {
                            this.andOn(`${node.tableAlias}.${rootColumn}`, `${childNode.tableAlias}.${joinColumn}`);
                        }
                        if (childNode.model.softDeletes && childNode.includeSoftDeleted !== true) {
                            this.andOn(function() {
                                this.orOnNull(`${childNode.tableAlias}.deleted_at`)
                                    .orOn(`${childNode.tableAlias}.deleted_at`, '>', knex.fn.now());
                            });
                        }
                    });
                    model.buildSelectSubQuery(query, childNode, firstMulti);
                }
            }
        }
    }

    private setSelectQueryLimitOffset(query: knexLib.QueryBuilder, options: ISelectOptions) {
        if (options.limit) {
            query.limit(options.limit);
        }
        if (options.limit && options.offset) {
            query.offset(options.offset);
        }
    }

    private setSelectQueryOrder(rootModel: typeof Model, query: knexLib.QueryBuilder, orders: Order[]) {

        const orderClauses = [];

        for (const order of orders) {
            const tables = typeof order[0] === 'string' ?
            [rootModel.tableName] :
            [rootModel.tableName, ...order[0].relation];
            const column = typeof order[0] === 'string' ? order[0] : order[0].column;
            const direction = order[1];

            // Create the tableAlias (and append the root table name)
            const tableAlias = tables.join(TABLE_JOIN_STRING);
            orderClauses.push({ column: `${tableAlias}.${column}`, order: direction });
        }

        query.orderBy(orderClauses);
    }

    /**
     * Includes can be defined with just string names as their associations. This
     * creates a include structure where every include item is an array of
     * objects
     * This function returns a standard include options object.
     * @param include An include that should be expanded
     */
    private standardizeSelectInclude(include: SelectInclude): IStandardizedSelectIncludedTableOptions {
        const includeOptions: IStandardizedSelectIncludedTableOptions = {};
        this._standardizeSelectInclude(include, includeOptions);
        // Return the include options or an empty array
        return includeOptions.include ? includeOptions.include : {};
    }

    /**
     * HELPER FUNCTION
     * Standardizes select includes recursively.
     */
    private _standardizeSelectInclude(include: SelectInclude, includeOptions: IStandardizedSelectIncludedTableOptions) {
        if (include) {
            includeOptions.include = {};

            const includes = arrayIfNot(include);

            for (const includeItem of includes) {
                if (typeof includeItem === 'string') {
                    includeOptions.include[includeItem] = { association: includeItem };
                } else if (typeof includeItem === 'object') {
                    includeOptions.include[includeItem.association] =
                        includeItem as IStandardizedSelectIncludedTableOptions;
                    this._standardizeSelectInclude(includeItem.include,
                        includeItem as IStandardizedSelectIncludedTableOptions);
                }
            }
        }
    }

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
    private addIncludeInSubqueryOptionToRelations(
        selectOptions: IStandardizedSelectOptions,
        associationSets: string[][]
        ): IStandardizedSelectOptions
    {

        // Clone it so we don't change the original
        const clonedSelectOptions = _.cloneDeep(selectOptions);

        for (const associations of associationSets) {

            // Navigate through the query options until we are at the right table
            let ptr = clonedSelectOptions;
            // if the length is 3, thent he first element is an array of associations
            for (const table of associations) {
                ptr = (ptr.include as any)[table];
                if (!ptr) {
                    throw new Error(`Error with order array. Association "${table}" not found in query options.`);
                }
            }
            ptr.includeInSubquery = true;

        }

        return clonedSelectOptions;
    }

    /**
     * This method searches a where function for columns that are declared as assciative
     * @param where The where function to search.
     */
    private getAssociationsFromWhere(where: IWhere) {
        const associations: string[][] = [];
        this._getAssociationsFromWhere(where, associations);
        return _.uniq(associations);
    }

    /**
     * HELPER FUNCTION
     * Recursively looks for associations in a where clause
     * @param where The where clause to search
     * @param associations Should be initiated as an empty array
     */
    private _getAssociationsFromWhere(where: IWhere, associations: string[][]) {
        let nextWheres;
        if (where.or) { nextWheres = where.or; }
        if (where.and) { nextWheres = where.and; }
        // Continue down
        if (nextWheres) {
            for (const nextWhere of nextWheres) {
                this._getAssociationsFromWhere(nextWhere, associations);
            }
        } else {
            const comparison = Object.values(where)[0] as ColumnValue<any>;
            if (typeof comparison[0] !== 'string') {
                associations.push(comparison[0].relation);
            }
        }
    }
}
