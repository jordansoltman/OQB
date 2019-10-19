import { IDatabaseData } from '../orm/types';

export enum ValidationConstraintType {
    CUSTOM = 'CUSTOM',
    STANDARD = 'STANDARD'
}

export enum StandardGroup {
    INSERT = 'INSERT',
    UPDATE = 'UPDATE'
}

/**
 * TABLE
 */

export const VALIDATION_DEFAULT_GROUP = 'VALIDATION_DEFAULT_GROUP';

export type TableValidationFunction =
    ((data: IDatabaseData, groups: string[]) => boolean | string) |
    ((data: IDatabaseData, groups: string[]) => Promise<boolean | string>);

export interface ITableValidationConstraint {
    error?: string;
    func: TableValidationFunction;
    groups: string[] | null;
}

/**
 * PROPERTY
 */

export type PropertyValidationFunction =
    ((value: any, data: IDatabaseData, groups: string[]) => boolean) |
    ((value: any, data: IDatabaseData, groups: string[]) => Promise<boolean>);

export interface IPropertyValidationConstraint {
    error: string;
    func: PropertyValidationFunction;
    groups: string[] | null;
}

export interface IValidationOptions {
    groups?: string | string[];
    error?: string;
    args?: any[];
}
