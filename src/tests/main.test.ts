import { expect } from 'chai';
import { resetDatabase, orm, loadData } from './setup';
import { SortDirection } from '../orm/types';



before(async () => {
    await resetDatabase();
    await loadData();
})

after(async() => {
    orm.knex.destroy();
})

describe('Query Selection', () => {

    it('can select all objects', async () => {
        const [result, count] = await orm.models.customer.findAll();
        expect(count).equal(4);
        expect(result.length).equal(4);
    });

    it('can order by a column asc', async () => {
        const [result, count] = await orm.models.customer.findAll({
            order: [['name', SortDirection.ASC]]
        });
        expect(result.length).equal(4);
        expect(result[0].name).equal('Brendan');
    });

    it('can order by a column desc', async () => {
        const [result, count] = await orm.models.customer.findAll({
            order: [['name', SortDirection.DESC]]
        })
        expect(result.length).equal(4);
        expect(result[0].name).equal('Michael');
    });

});