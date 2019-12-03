"use strict";
const isFunction = require("lodash.isfunction");
const isPlainObject = require("lodash.isplainobject");
const keys = require("lodash.keys");
const values = require("lodash.values");
// tslint:disable-next-line: no-namespace
var NestHydrationJS;
(function (NestHydrationJS_1) {
    function createCompositeKey(vals, separator = ', ') {
        return vals.join(separator);
    }
    // tslint:disable-next-line: no-shadowed-variable
    class NestHydrationJS {
        constructor() {
            this.typeHandlers = {
                NUMBER(cellValue) {
                    return parseFloat(cellValue);
                },
                BOOLEAN(cellValue) {
                    // tslint:disable-next-line: triple-equals
                    return cellValue == true;
                },
            };
            this.struct = null;
        }
        /* Creates a data structure containing nested objects and/or arrays from
         * tabular data based on a structure definition provided by
         * structPropToColumnMap. If structPropToColumnMap is not provided but
         * the data has column names that follow a particular convention then a
         * nested structures can also be created.
         */
        nest(data, structPropToColumnMap, verbose = false) {
            let table;
            // VALIDATE PARAMS AND BASIC INITIALIZATION
            // Determines that on no results, and empty list is used instead of null. // NOTE: fact check this
            let listOnEmpty = false;
            if (typeof structPropToColumnMap === 'undefined') {
                structPropToColumnMap = null;
            }
            if (data === null) {
                return null;
            }
            if (!Array.isArray(structPropToColumnMap) && !isPlainObject(structPropToColumnMap) &&
                structPropToColumnMap !== null && structPropToColumnMap !== true) {
                throw new Error('nest expects param structPropToColumnMap to be an array, plain object, null, or true');
            }
            if (isPlainObject(data)) {
                // internal table should be a table format but a plain object
                // could be passed as the first (and only) row of that table
                table = [data];
            }
            else if (Array.isArray(data)) {
                table = data;
            }
            else {
                // tslint:disable-next-line: max-line-length
                throw Error(`nest expects param data to be in the form of a plain object or an array of plain objects (forming a table)`);
            }
            // structPropToColumnMap can be set to true as a tie break between
            // returning null (empty structure) or an empty list
            if (structPropToColumnMap === true) {
                listOnEmpty = true;
                structPropToColumnMap = null;
            }
            if (structPropToColumnMap === null && table.length > 0) {
                // property mapping not specified, determine it from column names
                structPropToColumnMap = this.structPropToColumnMapFromColumnHints(keys(table[0]));
            }
            if (structPropToColumnMap === null) {
                // properties is empty, can't form structure or determine content
                // for a list. Assume a structure unless listOnEmpty
                return listOnEmpty ? [] : null;
            }
            else if (table.length === 0) {
                // table is empty, return the appropriate empty result based on input definition
                return Array.isArray(structPropToColumnMap) ? [] : null;
            }
            // COMPLETE VALIDATING PARAMS AND BASIC INITIALIZATION
            const meta = this.buildMeta(structPropToColumnMap);
            // BUILD FROM TABLE
            // defines function that can be called recursively
            const recursiveNest = (row, idColumns) => {
                // Obj is the actual object that will end up in the final structure
                let obj;
                // Get all of the values for each id
                let vals = idColumns.map((column) => row[column]);
                // only really concerned with the meta data for this identity column
                const objMeta = meta.idMap[createCompositeKey(idColumns)];
                // If any of the values are null, we'll check and see if we need to set defaults
                vals = vals.map((value, idx) => {
                    if (value === null) {
                        if (objMeta.defaults[idColumns[idx]] !== null && typeof objMeta.defaults[idColumns[idx]] !== 'undefined') {
                            return objMeta.defaults[idColumns[idx]];
                        }
                    }
                    return value;
                });
                if (vals.indexOf(null) !== -1) {
                    return;
                }
                // check if object already exists in cache
                if (typeof objMeta.cache[createCompositeKey(vals)] !== 'undefined') {
                    // not already placed as to-many relation in container
                    obj = objMeta.cache[createCompositeKey(vals)];
                    // Add array values if necessary
                    for (const prop of objMeta.arraysList) {
                        const cellValue = this.computeActualCellValue(prop, row[prop.column]);
                        if (Array.isArray(obj[prop.prop])) {
                            obj[prop.prop].push(cellValue);
                        }
                        else {
                            obj[prop.prop] = [cellValue];
                        }
                    }
                    if (objMeta.containingIdUsage === null) {
                        return;
                    }
                    // We know for certain that containing column is set if
                    // containingIdUsage is not null and can cast it as a string
                    // check and see if this has already been linked to the parent,
                    // and if so we don't need to continue
                    const containingIds = objMeta.containingColumn.map((column) => row[column]);
                    if (typeof objMeta.containingIdUsage[createCompositeKey(vals)] !== 'undefined'
                        && typeof objMeta.containingIdUsage[createCompositeKey(vals)][createCompositeKey(containingIds)] !== 'undefined') {
                        return;
                    }
                }
                else {
                    // don't have an object defined for this yet, create it and set the cache
                    obj = {};
                    objMeta.cache[createCompositeKey(vals)] = obj;
                    // copy in properties from table data
                    for (const prop of objMeta.valueList) {
                        const cellValue = this.computeActualCellValue(prop, row[prop.column]);
                        obj[prop.prop] = cellValue;
                    }
                    // Add array values
                    for (const prop of objMeta.arraysList) {
                        const cellValue = this.computeActualCellValue(prop, row[prop.column]);
                        if (Array.isArray(obj[prop.prop])) {
                            obj[prop.prop].push(cellValue);
                        }
                        else {
                            obj[prop.prop] = [cellValue];
                        }
                    }
                    // initialize empty to-many relations, they will be populated when
                    // those objects build themselves and find this containing object
                    for (const prop of objMeta.toManyPropList) {
                        obj[prop] = [];
                    }
                    // initialize null to-one relations and then recursively build them
                    for (const prop of objMeta.toOneList) {
                        obj[prop.prop] = null;
                        recursiveNest(row, Array.isArray(prop.column) ? prop.column : [prop.column]);
                    }
                }
                // link from the parent
                if (objMeta.containingColumn === null) {
                    // parent is the top level
                    if (objMeta.isOneOfMany) {
                        // it is an array
                        if (this.struct === null) {
                            this.struct = [];
                        }
                        this.struct.push(obj);
                    }
                    else {
                        // it is this object
                        this.struct = obj;
                    }
                }
                else {
                    const containingIds = objMeta.containingColumn.map((column) => row[column]);
                    const container = meta.idMap[createCompositeKey(objMeta.containingColumn)]
                        .cache[createCompositeKey(containingIds)];
                    // If a container exists, it must not be a root, and thus there should
                    // be an ownProp set
                    if (container) {
                        if (objMeta.isOneOfMany) {
                            // it is an array
                            container[objMeta.ownProp].push(obj);
                        }
                        else {
                            // it is this object
                            container[objMeta.ownProp] = obj;
                        }
                    }
                    // record the containing id so we don't do this again (return in earlier
                    // part of this method)
                    const containingIdUsage = objMeta.containingIdUsage;
                    if (typeof (containingIdUsage)[createCompositeKey(vals)] === 'undefined') {
                        containingIdUsage[createCompositeKey(vals)] = {};
                    }
                    containingIdUsage[createCompositeKey(vals)][createCompositeKey(containingIds)] = true;
                }
            };
            // struct is populated inside the build function
            this.struct = null;
            // tslint:disable-next-line: no-console
            if (verbose) {
                console.log(meta);
            }
            for (const row of table) {
                for (const primeIdColumn of meta.primeIdColumnList) {
                    // for each prime id column (corresponding to a to-many relation or
                    // the top level) attempted to build an object
                    recursiveNest(row, primeIdColumn);
                }
            }
            return this.struct;
        }
        /* Returns a property mapping data structure based on the names of columns
         * in columnList. Used internally by nest when its propertyMapping param
         * is not specified.
         *
         */
        structPropToColumnMapFromColumnHints(columnList, renameMapping) {
            if (typeof renameMapping === 'undefined') {
                renameMapping = {};
            }
            const propertyMapping = { base: null };
            for (const column of columnList) {
                const columnType = column.split('___');
                let type = null;
                let idFlagSet = false;
                let arrayFlagSet = false;
                for (let j = 1; j < columnType.length; j++) {
                    if (columnType[j] === 'ID') {
                        idFlagSet = true;
                    }
                    else if (typeof this.typeHandlers[columnType[j]] !== 'undefined') {
                        type = columnType[j];
                    }
                    if (columnType[j] === 'ARRAY') {
                        arrayFlagSet = true;
                    }
                }
                let pointer = propertyMapping; // point to base on each new column
                let prop = 'base';
                const navList = columnType[0].split('_');
                for (let j = 0; j < navList.length; j++) {
                    const nav = navList[j];
                    if (nav === '') {
                        if (pointer[prop] === null) {
                            pointer[prop] = [null];
                        }
                        pointer = pointer[prop];
                        prop = 0;
                    }
                    else {
                        if (pointer[prop] === null) {
                            pointer[prop] = {};
                        }
                        if (typeof pointer[prop][nav] === 'undefined') {
                            let renamedColumn = typeof renameMapping[column] === 'undefined'
                                ? column
                                : renameMapping[column];
                            if (type !== null || idFlagSet || arrayFlagSet) {
                                // no longer a simple mapping, has need of the type or id properties
                                renamedColumn = { column: renamedColumn };
                            }
                            if (type !== null) {
                                // detail the type in the column map if type provided
                                renamedColumn.type = type;
                            }
                            if (idFlagSet) {
                                // set the id property in the column map
                                renamedColumn.id = true;
                            }
                            if (arrayFlagSet) {
                                renamedColumn.array = true;
                            }
                            pointer[prop][nav] = j === (navList.length - 1)
                                ? renamedColumn // is leaf node, store full column string
                                : null // iteration will replace with object or array
                            ;
                        }
                        pointer = pointer[prop];
                        prop = nav;
                    }
                }
            }
            return propertyMapping.base;
        }
        /* Registers a custom type handler */
        registerType(name, handler) {
            if (this.typeHandlers[name]) {
                throw new Error('Handler with type, ' + name + ', already exists');
            }
            this.typeHandlers[name] = handler;
        }
        computeActualCellValue(props, initialValue) {
            let cellValue = initialValue;
            if (cellValue !== null) {
                let valueTypeFunction;
                if (isFunction(props.type)) {
                    valueTypeFunction = props.type;
                }
                else if (typeof props.type === 'string') {
                    valueTypeFunction = this.typeHandlers[props.type];
                }
                if (valueTypeFunction) {
                    cellValue = valueTypeFunction(cellValue);
                }
            }
            else if (typeof props.default !== 'undefined') {
                cellValue = props.default;
            }
            return cellValue;
        }
        /* Create a data structure that contains lookups and cache spaces for quick
         * reference and action for the workings of the nest method.
         */
        buildMeta(structPropToColumnMap) {
            let meta;
            // internally defines recursive function with extra param. This allows cleaner API
            const recursiveBuildMeta = (
            // tslint:disable-next-line: no-shadowed-variable
            structPropToColumnMap, isOneOfMany, containingColumn, ownProp) => {
                const idProps = [];
                let idColumns = [];
                const propList = keys(structPropToColumnMap);
                if (propList.length === 0) {
                    throw new Error('invalid structPropToColumnMap format - property \'' + ownProp + '\' can not be an empty array');
                }
                // Add all of the columns flagged as id to the array
                for (const prop of propList) {
                    if (structPropToColumnMap[prop].id === true) {
                        idProps.push(prop);
                    }
                }
                // If no columns are flagged as id, then use the first value in the prop list
                if (idProps.length === 0) {
                    idProps.push(propList[0]);
                }
                idColumns = idProps.map((prop) => {
                    return structPropToColumnMap[prop].column || structPropToColumnMap[prop];
                });
                if (isOneOfMany) {
                    meta.primeIdColumnList.push(idColumns);
                }
                const defaults = {};
                idProps.forEach((prop) => {
                    defaults[prop] = typeof structPropToColumnMap[prop].default === 'undefined' ?
                        null :
                        structPropToColumnMap[prop].default;
                });
                const objMeta = {
                    valueList: [],
                    toOneList: [],
                    arraysList: [],
                    toManyPropList: [],
                    containingColumn,
                    ownProp,
                    isOneOfMany: isOneOfMany === true,
                    cache: {},
                    containingIdUsage: containingColumn === null ? null : {},
                    defaults,
                };
                for (const prop of propList) {
                    if (typeof structPropToColumnMap[prop] === 'string') {
                        // value property
                        objMeta.valueList.push({
                            prop,
                            column: structPropToColumnMap[prop],
                            type: undefined,
                            default: undefined
                        });
                    }
                    else if (structPropToColumnMap[prop].column) {
                        // value property
                        const definitionColumn = structPropToColumnMap[prop];
                        const metaValueProps = {
                            prop,
                            column: definitionColumn.column,
                            type: definitionColumn.type,
                            default: definitionColumn.default,
                        };
                        // Add this column to our array list if necessary
                        if (definitionColumn.array === true) {
                            objMeta.arraysList.push(metaValueProps);
                        }
                        else {
                            objMeta.valueList.push(metaValueProps);
                        }
                    }
                    else if (Array.isArray(structPropToColumnMap[prop])) {
                        // list of objects / to-many relation
                        objMeta.toManyPropList.push(prop);
                        recursiveBuildMeta(structPropToColumnMap[prop][0], true, idColumns, prop);
                    }
                    else if (isPlainObject(structPropToColumnMap[prop])) {
                        // object / to-one relation
                        const subIdProps = [];
                        for (const value of values(structPropToColumnMap[prop])) {
                            if (typeof value === 'object' && value.id === true) {
                                subIdProps.push(value.column);
                            }
                        }
                        // If no columns are flagged as id, then use the first value in the prop list
                        if (subIdProps.length === 0) {
                            const column = values(structPropToColumnMap[prop])[0];
                            subIdProps.push(typeof column === 'object' ? column.column : column);
                        }
                        objMeta.toOneList.push({
                            prop,
                            column: subIdProps,
                        });
                        recursiveBuildMeta(structPropToColumnMap[prop], false, idColumns, prop);
                    }
                    else {
                        throw new Error('invalid structPropToColumnMap format - property \'' + prop +
                            '\' must be either a string, a plain object or an array');
                    }
                }
                meta.idMap[createCompositeKey(idColumns)] = objMeta;
            };
            // this data structure is populated by the _buildMeta function
            meta = {
                primeIdColumnList: [],
                idMap: {},
            };
            if (Array.isArray(structPropToColumnMap)) {
                if (structPropToColumnMap.length !== 1) {
                    // tslint:disable-next-line: max-line-length
                    throw new Error(`invalid structPropToColumnMap format - can not have multiple roots for structPropToColumnMap, if an array it must only have one item`);
                }
                // call with first object, but inform _buildMeta it is an array
                recursiveBuildMeta(structPropToColumnMap[0], true, null, null);
            }
            else if (isPlainObject(structPropToColumnMap)) {
                // register first column as prime id column
                const columns = values(structPropToColumnMap);
                if (columns.length === 0) {
                    throw new Error('invalid structPropToColumnMap format - the base object can not be an empty object');
                }
                // First determine if there are any keys set on the columns
                const idColumns = columns.reduce((accumulator, column) => {
                    if (column.id === true) {
                        accumulator.push(column.column);
                    }
                    return accumulator;
                }, []);
                // If there were no keys set, then take the first column as the id
                if (idColumns.length === 0) {
                    if (typeof columns[0] === 'string') {
                        idColumns.push(columns[0]);
                    }
                    else if (typeof columns[0].column === 'string') {
                        idColumns.push(columns[0].column);
                    }
                }
                meta.primeIdColumnList.push(idColumns);
                // construct the rest
                recursiveBuildMeta(structPropToColumnMap, false, null, null);
            }
            return meta;
        }
    }
    NestHydrationJS_1.NestHydrationJS = NestHydrationJS;
})(NestHydrationJS || (NestHydrationJS = {}));
module.exports = function generate() { return new NestHydrationJS.NestHydrationJS(); };
//# sourceMappingURL=hydration.js.map