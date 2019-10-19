import _ from 'lodash';
import validator from 'validator';
import { DatabaseValidator } from '../orm/database_validator';
import { arrayIfNot } from '../util';
import { IPropertyValidationConstraint, IValidationOptions, PropertyValidationFunction, ValidationConstraintType } from './types';

export class ValidationPropertyConstraintSet {

    private databaseValidator: DatabaseValidator;

    private constraints: IPropertyValidationConstraint[] = [];
    private customConstraints: IPropertyValidationConstraint[] = [];
    private requiredConstraint: boolean | string[] = false;
    private disallowNullConstraint: boolean | string[] = false;

    constructor(databaseValidator: DatabaseValidator) {
        this.databaseValidator = databaseValidator;
    }

    public getCustomConstraintsForGroups(groups?: string[]): IPropertyValidationConstraint[] {
        return this.getConstraintsForGroups(ValidationConstraintType.CUSTOM, groups);
    }

    public getStandardConstraintsForGroups(groups?: string[]): IPropertyValidationConstraint[] {
        return this.getConstraintsForGroups(ValidationConstraintType.STANDARD, groups);
    }

    public setRequired(group?: string | string[]) {
        if (!group) {
            this.requiredConstraint = true;
        } else {
            this.requiredConstraint = arrayIfNot(group);
        }
    }

    public setDisallowNull(group?: string | string[]) {
        if (!group) {
            this.disallowNullConstraint = true;
        } else {
            this.disallowNullConstraint = arrayIfNot(group);
        }
    }

    public isAlphanumeric(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Must be alpha-numeric.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isAlphanumeric.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isISO8601(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Must be valid ISO8601 date string.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isISO8601.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }
    
    public isWhitelisted(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Password contains invalid characters.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isWhitelisted.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isLength(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Must be within the valid length range.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isLength.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isBoolean(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Must be a valid email address.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isBoolean.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isEmail(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Must be a valid email address.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isEmail.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isInt(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Must be an integer.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isInt.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isNotEmpty(options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'Cannot be empty.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return !validator.isEmpty.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public isEmpty(options: IValidationOptions = {})
    {
        const error = options.error ? options.error : 'Must be empty.';
        const args = options.args ? options.args : [];
        const func = (value: string): boolean => {
            return validator.isEmpty.apply(null, [value, ...args]);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    /**
     * Checks if the property is an int and exists on the table. The default column name is 'id'.
     * @param tableName
     * @param column
     * @param options
     */
    public key(tableName: string, column: string = 'id', options: IValidationOptions = {})
    {
        this.isInt(options);
        this.exists(tableName, column, options);
    }

    // TODO: add soft delete option!
    public exists(tableName: string, column: string = 'id', options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'This value doesn\'t exist';
        const func = (value: string): Promise<boolean> => {
            return this.databaseValidator.exists({ [column]: value }, tableName, column);
        };
        this.addConstraint(func, error, { groups: options.groups });
    }

    public unique(tableName: string, column: string = 'id', options: IValidationOptions = {}) {
        const error = options.error ? options.error : 'This values must be unique in the database.';
        const func = (value:string): Promise<boolean> => {
            return this.databaseValidator.unique({ [column]: value }, tableName, column);
        }
        this.addConstraint(func, error, { groups: options.groups });
    }

    public addCustomConstraint(
        func: PropertyValidationFunction,
        error: string,
        options: { group?: string | string[] } = {})
    {
        this.addConstraint(func, error, { groups: options.group, type: ValidationConstraintType.CUSTOM });
    }

    public _isRequired(groups?: string[]): boolean {
        if (typeof this.requiredConstraint === 'boolean') {
            return this.requiredConstraint;
        } else {
            return _.intersection(this.requiredConstraint, groups).length > 0;
        }
    }

    public _disallowsNull(groups?: string[]): boolean {
        if (typeof this.disallowNullConstraint === 'boolean') {
            return this.disallowNullConstraint;
        } else {
            return _.intersection(this.disallowNullConstraint, groups).length > 0;
        }
    }

    private getConstraintsForGroups(
        type: ValidationConstraintType, 
        groups?: string[]): IPropertyValidationConstraint[] 
    {
        const constraints = type === ValidationConstraintType.STANDARD ? this.constraints : this.customConstraints;
        return constraints.filter((constraint) => {
            if (constraint.groups === null) { return true; } // All contraints without a group are returned
            if (groups) {
                return _.intersection(constraint.groups, groups).length > 0;
            }
        });
    }

    private addConstraint(
        func: PropertyValidationFunction,
        error: string,
        options: {
            groups?: string | string[],
            type?: ValidationConstraintType
        } = {})
    {
        const groups = Array.isArray(options.groups) || typeof options.groups === 'string' ?
            arrayIfNot(options.groups) :
            null;
        const type = options.type ? options.type : ValidationConstraintType.STANDARD;

        const constraint: IPropertyValidationConstraint = { func, error, groups };

        if (type === ValidationConstraintType.CUSTOM) {
            this.customConstraints.push(constraint);
        } else {
            this.constraints.push(constraint);
        }
    }

}
