"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ValidationPropertyErrors {
    constructor() {
        this.errors = {};
    }
    addError(property, error) {
        if (this.errors[property]) {
            this.errors[property].push(error);
        }
        else {
            this.errors[property] = [error];
        }
    }
    errorProperties() {
        return Object.keys(this.errors);
    }
    hasErrors() {
        return this.errorProperties().length !== 0;
    }
    getErrors() {
        return this.errors;
    }
}
exports.ValidationPropertyErrors = ValidationPropertyErrors;
//# sourceMappingURL=errors.js.map