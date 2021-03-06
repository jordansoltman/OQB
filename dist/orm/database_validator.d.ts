import { OQB } from '.';
export declare class DatabaseValidator {
    private orm;
    constructor(orm: OQB);
    exists(data: any, tableName: string, columns: string | string[]): Promise<boolean>;
    unique(data: any, tableName: string, columns: string | string[]): Promise<boolean>;
}
