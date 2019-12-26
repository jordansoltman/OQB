import knex, { Raw } from 'knex';
import { IColumnDefinition } from '.';
import { DataType } from './constant';

export type ForeignKey = string | IPrimaryKeyPairs;

export type SelectInclude = string | ISelectIncludedTableOptions | Array<string | ISelectIncludedTableOptions>;

export type Hook = ((data: IDatabaseData) => IDatabaseData) | ((data: IDatabaseData) => Promise<IDatabaseData>);

export enum SortDirection {
    ASC = 'ASC',
    DESC = 'DESC'
}

/**
 * Identifies a column by a relation (series of related tables) and
 * a column value on the final table.
 */
export interface IRelatedColumnIdentifier {
    relation: string[];
    column: string;
}

/**
 * A string specifying a column on the base table, or a related column identifier.
 */
export type ColumnIdentifier = string | IRelatedColumnIdentifier;

/**
 * Specifies a column and a value type. T specifies the type of value that should be
 * connected to the column.
 */
export type ColumnValue<T> = [ColumnIdentifier, T];

/**
 * Designates a column that should be sorted on and the direction of that sort.
 */
export type Order = ColumnValue<SortDirection>;

/**
 * Describes a where condition. Only one property should
 * be used at a time. Multiple conditions can be joined by
 * and and or objects.
 */
export interface IWhere {
    /**
     * All elements in this will grouped together in an
     * and clause
     */
    and?: IWhere[];

    /**
     * All elements in this will grouped together in an
     * or clause
     */
    or?: IWhere[];

    /**
     * Compared using the '!=' operator
     */
    neq?: ColumnValue<string | number | boolean | Date | Raw>;

    /**
     * Compared using the '=' operator
     */
    eq?: ColumnValue<string | number | boolean | Date | Raw>;

    /**
     * Compared using the 'like' operator
     */
    like?: ColumnValue<string | number>;

    /**
     * Compared using the 'in' operator. If array is empty no rows will be returned.
     */
    in?: ColumnValue<Array<string | number | boolean | Date>>;

    /**
     * Compared using the '>' operator
     */
    gt?: ColumnValue<number | Date | Raw | string>;

    /**
     * Compared using the '>=' operator
     */
    gte?: ColumnValue<number | Date | Raw | string>;

    /**
     * Compared using the '<' operator
     */
    lt?: ColumnValue<number | Date | Raw | string>;

    /**
     * Compared using the '<=' operator
     */
    lte?: ColumnValue<number | Date | Raw | string>;

}

/**
 * The select options for a table
 */
interface ISelectTableOptions {
    /**
     * Include options for tables that should be eagerly loaded with the request
     */
    include?: SelectInclude;

    /**
     * Ignore rows that have been soft deleted and include them in the results.
     * Default is false.
     */
    includeSoftDeleted?: boolean;

    /**
     * Table is required for the result. When true this results in a table being joined
     * with an inner join as opposed to a left join.
     */
    required?: boolean;

    /**
     * A where clause to apply to this table. When set, [[required]] becomes true.
     */
    where?: IWhere;

    /**
     * The attributes that should be included in the final result. This property
     * takes priority over [[excludeAttributes]]. Table primary keys cannot be
     * excluded.
     */
    attributes?: string[];

    /**
     * A list of properties to exclude from the final result. Will be ignored if
     * the [[attributes]] property is set. Table primary keys cannot be excluded.
     */
    excludeAttributes?: string[];

    /**
     * A flag for whether this table should be included in the subquery. This is
     * used internally by query generator and should not be set explicitly.
     * FIXME: this should maybe move?
     */
    includeInSubquery?: boolean;
}

/**
 * An included table has an association name and potentially arguments for the through
 * table as well.
 * TODO: Add attributes/excludeAttributes for the through table?
 */
export interface ISelectIncludedTableOptions extends ISelectTableOptions {
    association?: string;
    through?: {
        where?: IWhere;
        includeSoftDeleted?: boolean;
    };
}

// ** FIND QUERY

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
    // don't update timestamps
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

export type PrimaryKey = IPrimaryKeyPairs | string | number;
