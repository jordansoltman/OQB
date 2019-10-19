import _ from 'lodash';
import { DatabaseValidator } from '../orm/database_validator';
import { IDatabaseData } from '../orm/types';
import { arrayIfNot } from '../util';
import { ITableValidationConstraint, IValidationOptions, TableValidationFunction } from './types';

export class ValidationTable {

    private databaseValidator: DatabaseValidator;

    private constraints: ITableValidationConstraint[] = [];

    constructor(databaseValidator: DatabaseValidator) {
        this.databaseValidator = databaseValidator;
    }

    /**
     *
     * @param func The function to use to validate this contraint
     * @param options An options object that contains an error string, and any groups that this
     * contraint should be associated with. Error MUST be defined if the TableValidationFunction
     * returns a boolean instead of a string. If groups are left as null/undefined, then this will
     * run for every group.
     */
    public addConstraint(
        func: TableValidationFunction,
        options: {
            error?: string,
            groups?: string | string[] | null
        } = {})
    {
        const groups = Array.isArray(options.groups) || typeof options.groups === 'string' ?
            arrayIfNot(options.groups) :
            null;
        const constraint: ITableValidationConstraint = { func, error: options.error, groups };
        this.constraints.push(constraint);
    }

    /**
     * BUILT IN TABLE VAILDATIONS
     */

    // TODO: move these to an "extension" of the validator

    public unique(tableName: string, column: string | string[], options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Record already exists and is not unique.';
        const func = (data: IDatabaseData) => {
            return this.databaseValidator.unique(data, tableName, column);
        };
        this.addConstraint(func, {error, groups: options.groups});
    }

    public exists(tableName: string, column: string | string[], options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Record does not exist.';
        const func = (data: IDatabaseData) => {
            return this.databaseValidator.exists(data, tableName, column);
        };
        this.addConstraint(func, {error, groups: options.groups});
    }

    public async validate(data: IDatabaseData, groups?: string[]) {

        const errors: string[] = [];
        const constraints = this.getContraints(groups);

        // Get the group constraints which will either be of the group type or all.
        for (const constraint of constraints) {

            const result = await constraint.func(data, groups);

            if (result === false) {
                if (!constraint.error) { throw new Error('No error given for constraint!'); }
                errors.push(constraint.error);
            } else if (typeof result === 'string') {
                errors.push(result);
            }
        }

        return errors;
    }

    private getContraints(groups?: string[]): ITableValidationConstraint[] {
        // If group is declared, we only get the contraints matching
        // the group as well as the ones with no group. If a group is
        // not declared, we only get the constraints without any group.
        return this.constraints.filter((constraint) => {
            if (constraint.groups === null) { return true; } // All contraints without a group are returned
            if (groups) {
                return _.intersection(constraint.groups, groups).length > 0;
            }
        });
    }
}
