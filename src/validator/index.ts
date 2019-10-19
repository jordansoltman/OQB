import { Orm } from '../orm';
import { DatabaseValidator } from '../orm/database_validator';
import { IDatabaseData } from '../orm/types';
import { arrayIfNot } from '../util';
import { IValidationErrors } from './errors';
import { ValidationProperties } from './properties';
import { ValidationPropertyConstraintSet } from './property_constraint_set';
import { ValidationTable } from './table';

export class Validator {

    private validationProperties: ValidationProperties;
    private validationTable: ValidationTable;

    constructor(orm: Orm) {
        const databaseValidator = new DatabaseValidator(orm);
        this.validationProperties = new ValidationProperties(databaseValidator);
        this.validationTable = new ValidationTable(databaseValidator);
    }

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
    public async validate(
        data: IDatabaseData,
        group: string | string[] = null,
        options: { properties?: string[] } = {})
        : Promise<null | IValidationErrors> {

        const groups = arrayIfNot(group);

        const fieldErrors = await this.validationProperties.validate(data, groups, options.properties);

        if (fieldErrors.hasErrors()) {
            return {
                property: fieldErrors.getErrors()
            };
        }

        const tableErrors = await this.validationTable.validate(data, groups);

        if (tableErrors.length !== 0) {
            return {
                errors: tableErrors
            };
        }

        return null;

    }

    public get set(): ValidationTable {
        return this.validationTable;
    }

    public property(
        prop: string,
        constraints: (property: ValidationPropertyConstraintSet) => void,
        dependentProperties?: string[])
    {
        this.validationProperties.property(prop, constraints, dependentProperties);
    }

}
