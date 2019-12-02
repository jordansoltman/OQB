import { OQB } from '../orm';
import { IDatabaseData } from '../orm/types';
import { IValidationErrors } from './errors';
import { ValidationPropertyConstraintSet } from './property_constraint_set';
import { ValidationTable } from './table';
export declare class Validator {
    private validationProperties;
    private validationTable;
    constructor(orm: OQB);
    /**
     * Validates the data for the given group.
     *
     * @param {IDatabaseData} data The data to validate
     * @param {ValidationGroupMethod} group The group to use for validation
     * @returns {(Promise<null | IValidationErrors>)} Returns null if their are no errors,
     * otherwise an object of errors:
     *  {
     *      <property name>: string[] - array of errors
     *  }
     */
    validate(data: IDatabaseData, group?: string | string[], options?: {
        properties?: string[];
    }): Promise<null | IValidationErrors>;
    get set(): ValidationTable;
    property(prop: string, constraints: (property: ValidationPropertyConstraintSet) => void, dependentProperties?: string[]): void;
}
