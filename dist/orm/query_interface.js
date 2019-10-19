"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const pluralize_1 = require("pluralize");
const util_1 = require("../util");
const assocations_1 = require("./assocations");
const TABLE_JOIN_STRING = '->';
class QueryInterface {
    constructor(knex) {
        this.knex = knex;
    }
    insert(model, values, options) {
        const tableName = model.tableName;
        const query = this.knex(tableName).insert(values);
        if (options.log) {
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return query;
    }
    update(model, values, options) {
        const tableName = model.tableName;
        const query = this.knex(tableName).update(values);
        if (options.where) {
            this.buildWhereQuery(query, tableName, options.where);
        }
        if (options.log) {
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return query;
    }
    delete(model, options) {
        const tableName = model.tableName;
        const query = this.knex(tableName).delete();
        if (options.where) {
            this.buildWhereQuery(query, tableName, options.where);
        }
        if (options.log) {
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return query;
    }
    select(rootModel, options) {
        const tableName = rootModel.tableName;
        const selectOptions = Object.assign({}, options);
        const orders = selectOptions.order ? selectOptions.order : [];
        selectOptions.include =
            this.standardizeSelectInclude(selectOptions.include);
        let standardizedOptions = selectOptions;
        const whereAssociations = selectOptions.where ? this.getAssociationsFromWhere(selectOptions.where) : [];
        const orderAssociations = orders
            .filter((order) => typeof order[0] !== 'string')
            .map((order) => order[0].relation);
        standardizedOptions = this.addIncludeInSubqueryOptionToRelations(standardizedOptions, [...orderAssociations, ...whereAssociations]);
        const [joinTree, definition, meta] = this.buildSelectJoinTree(rootModel, standardizedOptions);
        const query = this.knex.queryBuilder().options({ nestTables: '.' });
        const countQuery = this.knex.queryBuilder().count('* as count').from(tableName);
        const queryBuilder = this;
        if (joinTree.required || (standardizedOptions.limit && meta.hasMultiAssociation)) {
            query.from(function () {
                const subQuery = this.select(`${tableName}.*`).from(tableName).as(tableName);
                queryBuilder.buildSelectSubQuery(subQuery, joinTree, true);
                queryBuilder.setSelectQueryLimitOffset(subQuery, standardizedOptions);
                queryBuilder.setSelectQueryOrder(rootModel, subQuery, orders);
            });
            queryBuilder.buildSelectSubQuery(countQuery, joinTree, true);
        }
        else {
            query.select().from(tableName);
            queryBuilder.setSelectQueryLimitOffset(query, standardizedOptions);
            queryBuilder.buildSelectQuery(countQuery, joinTree);
        }
        this.setSelectQueryOrder(rootModel, query, orders);
        this.buildSelectQuery(query, joinTree);
        if (options.log === true) {
            console.log(query.toString());
        }
        if (options.transaction) {
            query.transacting(options.transaction);
        }
        return [query, countQuery, definition];
    }
    buildSelectJoinTree(rootModel, options) {
        const rootTableName = rootModel.tableName;
        const rootNode = {
            model: rootModel,
            parent: null,
            tableAlias: rootTableName
        };
        const includeOptions = {
            include: options.include,
            where: options.where,
            includeSoftDeleted: options.includeSoftDeleted,
            attributes: options.attributes,
            excludeAttributes: options.excludeAttributes
        };
        const definition = {};
        const meta = {
            hasMultiAssociation: false
        };
        this._buildSelectJoinTree(includeOptions, rootNode, definition, [rootTableName], meta);
        return [rootNode, definition, meta];
    }
    _buildSelectJoinTree(include, node, definition, path, meta) {
        const rootDefinition = Array.isArray(definition) ? definition[0] : definition;
        let columnNames = node.model.columnNames;
        const primaryKeyColumnNames = node.model.primaryKeyColumnNames;
        if (typeof include === 'object') {
            const includeOptions = include;
            if (includeOptions.attributes) {
                const allAttributes = [...primaryKeyColumnNames, ...includeOptions.attributes];
                columnNames = lodash_1.default.intersection(lodash_1.default.uniq(allAttributes), columnNames);
            }
            else if (includeOptions.excludeAttributes) {
                const difference = lodash_1.default.difference(columnNames, includeOptions.excludeAttributes);
                columnNames = lodash_1.default.uniq([...difference, ...primaryKeyColumnNames]);
            }
        }
        if (rootDefinition) {
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
            const includeOptions = include;
            node.where = includeOptions.where;
            node.includeSoftDeleted = includeOptions.includeSoftDeleted === true;
            node.required = includeOptions.required === true || includeOptions.where !== undefined;
            node.includeInSubquery = includeOptions.includeInSubquery === true;
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
                for (const childInclude of Object.values(includeOptions.include)) {
                    const assocationName = childInclude.association;
                    let throughOptions = {};
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
                    let nextDefinition = {};
                    const throughDefinition = {};
                    if (assocation instanceof assocations_1.BelongsToManyAssociation) {
                        rootPath.push('through+' + assocationName);
                        const tableAlias = rootPath.join(TABLE_JOIN_STRING);
                        const throughNode = {
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
                        if (currentNode.required) {
                            let nodePtr = node;
                            while (nodePtr !== null) {
                                nodePtr.required = true;
                                nodePtr = nodePtr.parent;
                            }
                        }
                        assocation.through.columnNames.forEach((columnName) => {
                            throughDefinition[columnName] = assocation.through.primaryKeyColumnNames.includes(columnName) ?
                                { column: tableAlias + '.' + columnName, id: true } :
                                tableAlias + '.' + columnName;
                        });
                    }
                    if (rootDefinition &&
                        !(includeOptions.attributes &&
                            !includeOptions.attributes.includes(assocationName)) &&
                        !(includeOptions.excludeAttributes &&
                            includeOptions.excludeAttributes.includes(assocationName))) {
                        if (assocation instanceof assocations_1.BelongsToAssociation) {
                            rootDefinition[assocationName] = nextDefinition;
                        }
                        else if (assocation instanceof assocations_1.HasManyAssocation) {
                            rootDefinition[assocationName] = [nextDefinition];
                        }
                        else {
                            rootDefinition[assocationName] = [throughDefinition];
                            throughDefinition[pluralize_1.singular(assocationName)] = nextDefinition;
                        }
                    }
                    else {
                        nextDefinition = null;
                    }
                    rootPath.push(assocationName);
                    const newNode = {
                        parent: currentNode,
                        model: assocation.to,
                        multiAssociation: assocation instanceof assocations_1.HasManyAssocation ? true : false,
                        keyMap: assocation.toKeyMap,
                        tableAlias: rootPath.join(TABLE_JOIN_STRING)
                    };
                    currentNode.children.push(newNode);
                    this._buildSelectJoinTree(childInclude, newNode, nextDefinition, rootPath, meta);
                }
            }
        }
    }
    buildSelectQuery(query, node) {
        if (node.model.softDeletes === true && node.includeSoftDeleted !== true && node.parent === null) {
            query.where(function () {
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
                query[joinType](`${tableName} AS ${childNode.tableAlias}`, function () {
                    for (const [rootColumn, joinColumn] of Object.entries(childNode.keyMap)) {
                        this.andOn(`${node.tableAlias}.${rootColumn}`, `${childNode.tableAlias}.${joinColumn}`);
                    }
                    if (childNode.model.softDeletes && childNode.includeSoftDeleted !== true) {
                        this.andOn(function () {
                            this.orOnNull(`${childNode.tableAlias}.deleted_at`)
                                .orOn(`${childNode.tableAlias}.deleted_at`, '>', knex.fn.now());
                        });
                    }
                });
                this.buildSelectQuery(query, childNode);
            }
        }
    }
    buildWhereQuery(query, table, where, and = true) {
        const model = this;
        const method = and ? 'andWhere' : 'orWhere';
        function column(comparison) {
            if (typeof comparison[0] !== 'string') {
                return [table, ...comparison[0].relation]
                    .join(TABLE_JOIN_STRING) + '.' + comparison[0].column;
            }
            else {
                return table + '.' + comparison[0];
            }
        }
        if (where.eq) {
            const value = where.eq[1];
            if (value === null) {
                query[and ? 'whereNull' : 'orWhereNull'](column(where.eq));
            }
            else {
                query[method](column(where.eq), '=', where.eq[1]);
            }
        }
        if (where.neq) {
            const value = where.neq[1];
            if (value === null) {
                query[and ? 'whereNotNull' : 'orWhereNotNull'](column(where.neq));
            }
            else {
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
            query[method](function () {
                for (const childOr of where.or) {
                    model.buildWhereQuery(this, table, childOr, false);
                }
            });
        }
        if (where.and) {
            query[method](function () {
                for (const childAnd of where.and) {
                    model.buildWhereQuery(this, table, childAnd, true);
                }
            });
        }
    }
    buildSelectSubQuery(query, node, firstMulti) {
        const model = this;
        const knex = this.knex;
        console.log(knex.fn.now());
        if (node.model.softDeletes === true && node.includeSoftDeleted !== true && node.parent === null) {
            query.where(function () {
                this.orWhereNull(`${node.tableAlias}.deleted_at`)
                    .orWhere(`${node.tableAlias}.deleted_at`, '>', knex.fn.now());
            });
        }
        if (node.where) {
            model.buildWhereQuery(query, node.tableAlias, node.where);
        }
        if (node.children) {
            for (const childNode of node.children) {
                if (!childNode.required && !childNode.includeInSubquery) {
                    continue;
                }
                const tableName = childNode.model.tableName;
                if (childNode.multiAssociation && firstMulti) {
                    query.whereExists((subQuery) => {
                        subQuery.select().from(`${tableName} AS ${childNode.tableAlias}`).where(function () {
                            for (const [rootColumn, joinColumn] of Object.entries(childNode.keyMap)) {
                                this.andWhereRaw(`\`${node.tableAlias}\`.\`${rootColumn}\` = \`${childNode.tableAlias}\`.\`${joinColumn}\``);
                            }
                            if (childNode.model.softDeletes && childNode.includeSoftDeleted !== true) {
                                this.where(function () {
                                    this.orWhereNull(`${childNode.tableAlias}.deleted_at`)
                                        .orWhere(`${childNode.tableAlias}.deleted_at`, '>', knex.fn.now());
                                });
                            }
                        })
                            .limit(1);
                        model.buildSelectSubQuery(subQuery, childNode, false);
                    });
                }
                else {
                    const joinType = childNode.required ? 'innerJoin' : 'leftJoin';
                    query[joinType](`${tableName} AS ${childNode.tableAlias}`, function () {
                        for (const [rootColumn, joinColumn] of Object.entries(childNode.keyMap)) {
                            this.andOn(`${node.tableAlias}.${rootColumn}`, `${childNode.tableAlias}.${joinColumn}`);
                        }
                        if (childNode.model.softDeletes && childNode.includeSoftDeleted !== true) {
                            this.andOn(function () {
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
    setSelectQueryLimitOffset(query, options) {
        if (options.limit) {
            query.limit(options.limit);
        }
        if (options.limit && options.offset) {
            query.offset(options.offset);
        }
    }
    setSelectQueryOrder(rootModel, query, orders) {
        const orderClauses = [];
        for (const order of orders) {
            const tables = typeof order[0] === 'string' ?
                [rootModel.tableName] :
                [rootModel.tableName, ...order[0].relation];
            const column = typeof order[0] === 'string' ? order[0] : order[0].column;
            const direction = order[1];
            const tableAlias = tables.join(TABLE_JOIN_STRING);
            orderClauses.push({ column: `${tableAlias}.${column}`, order: direction });
        }
        query.orderBy(orderClauses);
    }
    standardizeSelectInclude(include) {
        const includeOptions = {};
        this._standardizeSelectInclude(include, includeOptions);
        return includeOptions.include ? includeOptions.include : {};
    }
    _standardizeSelectInclude(include, includeOptions) {
        if (include) {
            includeOptions.include = {};
            const includes = util_1.arrayIfNot(include);
            for (const includeItem of includes) {
                if (typeof includeItem === 'string') {
                    includeOptions.include[includeItem] = { association: includeItem };
                }
                else if (typeof includeItem === 'object') {
                    includeOptions.include[includeItem.association] =
                        includeItem;
                    this._standardizeSelectInclude(includeItem.include, includeItem);
                }
            }
        }
    }
    addIncludeInSubqueryOptionToRelations(selectOptions, associationSets) {
        const clonedSelectOptions = lodash_1.default.cloneDeep(selectOptions);
        for (const associations of associationSets) {
            let ptr = clonedSelectOptions;
            for (const table of associations) {
                ptr = ptr.include[table];
                if (!ptr) {
                    throw new Error(`Error with order array. Association "${table}" not found in query options.`);
                }
            }
            ptr.includeInSubquery = true;
        }
        return clonedSelectOptions;
    }
    getAssociationsFromWhere(where) {
        const associations = [];
        this._getAssociationsFromWhere(where, associations);
        return lodash_1.default.uniq(associations);
    }
    _getAssociationsFromWhere(where, associations) {
        let nextWheres;
        if (where.or) {
            nextWheres = where.or;
        }
        if (where.and) {
            nextWheres = where.and;
        }
        if (nextWheres) {
            for (const nextWhere of nextWheres) {
                this._getAssociationsFromWhere(nextWhere, associations);
            }
        }
        else {
            const comparison = Object.values(where)[0];
            if (typeof comparison[0] !== 'string') {
                associations.push(comparison[0].relation);
            }
        }
    }
}
exports.QueryInterface = QueryInterface;
//# sourceMappingURL=query_interface.js.map