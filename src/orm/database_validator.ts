import { OQB } from '.';
import { arrayIfNot } from '../util';
import { IWhere } from './types';

export class DatabaseValidator {

    private orm: OQB;

    constructor(orm: OQB) {
        this.orm = orm;
    }

    // TODO: this should support composite keys
    public async exists(data: any, tableName: string, columns: string | string[]): Promise<boolean> {
        const where: IWhere = { and: [] };
        for (const column of arrayIfNot(columns)) {
            where.and.push({ eq: [column, data[column]] });
        }
        const count = await this.orm.models[tableName].count({ where });
        return count > 0;
    }

    // TODO: this should support soft deletes
    public async unique(data: any, tableName: string, columns: string | string[]) {
        const where: IWhere = { and: [] };
        for (const column of arrayIfNot(columns)) {
            where.and.push( { eq: [column, data[column]] } );
        }
        const count = await this.orm.models[tableName].count({ where });
        return count === 0;
    }

}
