import _ from 'lodash';
import { DatabaseValidator } from '../orm/database_validator';
import { IDatabaseData } from '../orm/types';
import { ValidationPropertyErrors } from './errors';
import { ValidationPropertyConstraintSet } from './property_constraint_set';

export class ValidationProperties {

    private databaseValidator: DatabaseValidator;

    private validationProperties: {
        [property: string]: ValidationPropertyConstraintSet;
    } = {};

    private validationPropertyDependencies: {
        [property: string]: string[];
    } = {};

    constructor(databaseValidator: DatabaseValidator) {
        this.databaseValidator = databaseValidator;
    }

    public property(
        prop: string,
        constraints: (property: ValidationPropertyConstraintSet) => void,
        dependentProperties?: string[])
    {

        // If there isn't an existing validation property then we will create one.
        if (!this.validationProperties[prop]) {
            this.validationProperties[prop] = new ValidationPropertyConstraintSet(this.databaseValidator);
        }

        const constraintSet = this.validationProperties[prop];

        // TODO: is this going to fuck shit up... with the above changes? Dependencies then become property wide?
        // Save the dependencies if they are set
        if (dependentProperties) {
            this.validationPropertyDependencies[prop] = dependentProperties;
        }
        constraints(constraintSet);
    }

    /**
     *
     * @param data The data to validate
     * @param groups The groups to use for validation
     * @param properties Properties to validate, if null, all properties will be vaildated
     */
    public async validate(data: IDatabaseData, groups?: string[], properties: string[] = null) {

        const errors = new ValidationPropertyErrors();

        let availableProperties = this.validationProperties;

        if (Array.isArray(properties)) {
            availableProperties = _.pick(availableProperties, properties);
        }

        for (const [property, constraintSet] of Object.entries(availableProperties)) {

            // Ensure that all of the dependencies have been met for this property to actually run
            const dependencies = this.validationPropertyDependencies[property];
            if (_.intersection(dependencies, errors.errorProperties()).length !== 0) {
                continue;
            }

            const value = data[property];
            let skipNormalValidators = false;
            let skipCustomValidators = false;

            // See if this the property is required and if it's supplied
            if (value === undefined) {
                if (constraintSet._isRequired(groups)) {
                    errors.addError(property, 'Value is required.');
                }
                // We won't keep doing anything with this if it's required but was not supplied.
                skipNormalValidators = true;
            }

            if (value === null) {
                if (constraintSet._disallowsNull(groups)) {
                    errors.addError(property, 'Value cannot be null.');
                }
                // We will keep validating, but won't do the normal validators because they
                // will all return false.
                skipNormalValidators = true;
            }

            // Unless we are skipping normal validators, will will run each of those.
            if (!skipNormalValidators) {
                for (const constraint of constraintSet.getStandardConstraintsForGroups(groups)) {
                    if (!await constraint.func(String(value), data, groups)) {
                        errors.addError(property, constraint.error);
                        // Don't check any further
                        skipCustomValidators = true;
                        break;
                    }
                }
            }

            // Run custom validators if the normal validators have succeeded.
            if (!skipCustomValidators) {
                for (const constraint of constraintSet.getCustomConstraintsForGroups(groups)) {
                    let result: boolean;
                    result = await constraint.func(value, data, groups);
                    if (!result) {
                        errors.addError(property, constraint.error);
                        break;
                    }
                }
            }

        }

        return errors;
    }

}
