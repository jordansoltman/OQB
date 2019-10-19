import { DatabaseValidator } from '../orm/database_validator';
import { IDatabaseData } from '../orm/types';
import { IValidationOptions, TableValidationFunction } from './types';
export declare class ValidationTable {
    private databaseValidator;
    private constraints;
    constructor(databaseValidator: DatabaseValidator);
    /**
     *
     * @param func The function to use to validate this contraint
     * @param options An options object that contains an error string, and any groups that this
     * contraint should be associated with. Error MUST be defined if the TableValidationFunction
     * returns a boolean instead of a string. If groups are left as null/undefined, then this will
     * run for every group.
     */
    addConstraint(func: TableValidationFunction, options?: {
        error?: string;
        groups?: string | string[] | null;
    }): void;
    /**
     * BUILT IN TABLE VAILDATIONS
     */
    unique(tableName: string, column: string | string[], options?: IValidationOptions): void;
    exists(tableName: string, column: string | string[], options?: IValidationOptions): void;
    validate(data: IDatabaseData, groups?: string[]): Promise<string[]>;
    private getContraints;
}
