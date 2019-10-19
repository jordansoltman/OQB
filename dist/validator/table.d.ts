import { DatabaseValidator } from '../orm/database_validator';
import { IDatabaseData } from '../orm/types';
import { IValidationOptions, TableValidationFunction } from './types';
export declare class ValidationTable {
    private databaseValidator;
    private constraints;
    constructor(databaseValidator: DatabaseValidator);
    addConstraint(func: TableValidationFunction, options?: {
        error?: string;
        groups?: string | string[] | null;
    }): void;
    unique(tableName: string, column: string | string[], options?: IValidationOptions): void;
    exists(tableName: string, column: string | string[], options?: IValidationOptions): void;
    validate(data: IDatabaseData, groups?: string[]): Promise<string[]>;
    private getContraints;
}
