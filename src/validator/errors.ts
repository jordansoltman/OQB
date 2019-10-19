export class ValidationPropertyErrors {
    private errors: {
        [key: string]: string[]
    } = {};

    public addError(property: string, error: string) {
        if (this.errors[property]) {
            this.errors[property].push(error);
        } else {
            this.errors[property] = [error];
        }
    }

    public errorProperties(): string[] {
        return Object.keys(this.errors);
    }

    public hasErrors() {
        return this.errorProperties().length !== 0;
    }

    public getErrors() {
        return this.errors;
    }
}

export interface IValidationErrors {
    property?: {
        [key: string]: string[]
    };
    errors?: string[];
}
