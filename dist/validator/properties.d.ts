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
    validate(data: IDatabaseData, groups?: string[], properties?: string[]): Promise<ValidationPropertyErrors>;
}
