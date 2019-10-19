import { DatabaseValidator } from '../orm/database_validator';
import { IPropertyValidationConstraint, IValidationOptions, PropertyValidationFunction } from './types';
export declare class ValidationPropertyConstraintSet {
    private databaseValidator;
    private constraints;
    private customConstraints;
    private requiredConstraint;
    private disallowNullConstraint;
    constructor(databaseValidator: DatabaseValidator);
    getCustomConstraintsForGroups(groups?: string[]): IPropertyValidationConstraint[];
    getStandardConstraintsForGroups(groups?: string[]): IPropertyValidationConstraint[];
    setRequired(group?: string | string[]): void;
    setDisallowNull(group?: string | string[]): void;
    isAlphanumeric(options?: IValidationOptions): void;
    isISO8601(options?: IValidationOptions): void;
    isWhitelisted(options?: IValidationOptions): void;
    isLength(options?: IValidationOptions): void;
    isBoolean(options?: IValidationOptions): void;
    isEmail(options?: IValidationOptions): void;
    isInt(options?: IValidationOptions): void;
    isNotEmpty(options?: IValidationOptions): void;
    isEmpty(options?: IValidationOptions): void;
    /**
     * Checks if the property is an int and exists on the table. The default column name is 'id'.
     * @param tableName
     * @param column
     * @param options
     */
    key(tableName: string, column?: string, options?: IValidationOptions): void;
    exists(tableName: string, column?: string, options?: IValidationOptions): void;
    unique(tableName: string, column?: string, options?: IValidationOptions): void;
    addCustomConstraint(func: PropertyValidationFunction, error: string, options?: {
        group?: string | string[];
    }): void;
    _isRequired(groups?: string[]): boolean;
    _disallowsNull(groups?: string[]): boolean;
    private getConstraintsForGroups;
    private addConstraint;
}
