export declare class ValidationPropertyErrors {
    private errors;
    addError(property: string, error: string): void;
    errorProperties(): string[];
    hasErrors(): boolean;
    getErrors(): {
        [key: string]: string[];
    };
}
export interface IValidationErrors {
    property?: {
        [key: string]: string[];
    };
    errors?: string[];
}
