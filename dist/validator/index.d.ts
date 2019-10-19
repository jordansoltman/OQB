import { Orm } from '../orm';
import { IDatabaseData } from '../orm/types';
import { IValidationErrors } from './errors';
import { ValidationPropertyConstraintSet } from './property_constraint_set';
import { ValidationTable } from './table';
export declare class Validator {
    private validationProperties;
    private validationTable;
    constructor(orm: Orm);
    validate(data: IDatabaseData, group?: string | string[], options?: {
        properties?: string[];
    }): Promise<null | IValidationErrors>;
    readonly set: ValidationTable;
    property(prop: string, constraints: (property: ValidationPropertyConstraintSet) => void, dependentProperties?: string[]): void;
}
