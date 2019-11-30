import { expect } from 'chai';
import { resetDatabase, orm, loadData } from './setup';
import { SortDirection } from '../orm/types';



beforeEach(async () => {
    await resetDatabase();
    await loadData();
})

after(async() => {
    orm.knex.destroy();
})

describe('Query Selection', () => {
    it('get associated values with where clause', async () => {
        const [result, count] = await orm.models.customer.findAll({
            log: true,
            include: [{
                association: 'orders',
                where: {
                    eq: ['status', 'SHIPPED']
                },
                include: {
                    association: 'customer',
                    include: {
                        association: 'orders',
                        where: {
                            eq: ['status', 'SHIPPED']
                        }
                    }
                }
            }, {
                association: 'companies',
                where: {
                    eq: ['id', 3]
                }
            }, {
                association: 'friends',
                where: {
                    eq: ['id', 3]
                },
                include: ['orders']
            }],
            // order: [
            //     [{ relation: ['orders'], column: 'id' }, SortDirection.DESC]
            // ]
        })
        console.log();
    })

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

    it('get included has many', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: ['orders']
        });
        expect(result[2].orders.length).equal(3);
    });


});
