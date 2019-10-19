import { DatabaseValidator } from '../orm/database_validator';
import { IDatabaseData } from '../orm/types';
import { ValidationPropertyErrors } from './errors';
import { ValidationPropertyConstraintSet } from './property_constraint_set';
export declare class ValidationProperties {
    private databaseValidator;
    private validationProperties;
    private validationPropertyDependencies;
    constructor(databaseValidator: DatabaseValidator);
    property(prop: string, constraints: (property: ValidationPropertyConstraintSet) => void, dependentProperties?: string[]): void;
    /**
     *
     * @param data The data to validate
     * @param groups The groups to use for validation
     * @param properties Properties to validate, if null, all properties will be vaildated
     */
    validate(data: IDatabaseData, groups?: string[], properties?: string[]): Promise<ValidationPropertyErrors>;
}
