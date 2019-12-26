import { expect } from 'chai';
import { resetDatabase, orm, loadData } from './setup';
import { SortDirection } from '../orm/types';
import { executionAsyncId } from 'async_hooks';



before(async () => {
    await resetDatabase();
    await loadData();
})

after(async() => {
    orm.knex.destroy();
})

describe('Dates and date times', () => {
    
    it('can fetch date times', async () => {
        const result = await orm.models.customer.findAll();
        console.log();
    });

})

describe('Find All Query Selection', () => {

    it('can order when limited and including multi-relation', async () => {
        const result = await orm.models.customer.findOne({
            order: [['id', SortDirection.DESC]],
            include: ['orders', 'value']
        });
        expect(result).to.not.equal(null);
        expect(result.id).to.equal(4);
    });

    it('can handle multiple orders on the base table when limited and including multi-relation', async () => {
        const result = await orm.models.customer.findOne({
            order: [['name', SortDirection.ASC], ['id', SortDirection.DESC]],
            include: ['orders', 'value']
        });
        expect(result).to.not.equal(null);
        expect(result.id).to.equal(3);
    });

    it('can handle multiple orders on the base table and joined table when limited and including multi-relation', async () => {
        const result = await orm.models.customer.findOne({
            order: [['name', SortDirection.ASC], [{relation: ['orders'], column: 'id'}, SortDirection.DESC]],
            include: ['orders', 'value']
        });
        expect(result).to.not.equal(null);
        expect(result.id).to.equal(3);
        expect(result.orders[0].id).to.equal(8);
    });

    it('can select all objects', async () => {
        const [result, count] = await orm.models.customer.findAll();
        expect(count).equal(4);
        expect(result.length).equal(4);
    });

    it('can order by a column asc', async () => {
        const [result, count] = await orm.models.customer.findAll({
            order: [['name', SortDirection.ASC]]
        });
        expect(count).to.equal(4);
        expect(result.length).equal(4);
        expect(result[0].name).equal('Brendan');
    });

    it('can order by a column desc', async () => {
        const [result, count] = await orm.models.customer.findAll({
            order: [['name', SortDirection.DESC]]
        })
        expect(count).to.equal(4);
        expect(result.length).equal(4);
        expect(result[0].name).equal('Michael');
    });

    it('should ignore things that have been soft deleted by default', async () => {
        const [result, count] = await orm.models.company.findAll();
        expect(result).length(3);
        expect(count).equal(3);
    })

    it('should include soft deleted entries when include soft delete when includeSoftDeleted flag is set', async () => {
        const [result, count] = await orm.models.company.findAll({ includeSoftDeleted: true });
        expect(result).length(4);
        expect(count).equal(4);
    });

    it('get included belongs to many', async () => {
        const [result, count] = await orm.models.customer.findAll({ include: 'friends' });
        expect(result).length(4);
        expect(count).to.equal(4);
        expect(result[0].friends).length(2);
    });

    it('get included has one', async () => {
        const [result, count] = await orm.models.customer.findAll({ 
            include: 'value'
        });
        expect(count).to.equal(4);
        expect(result[0].value).to.not.equal(null);
        expect(result[2].value).to.equal(null);
    });

    it('get included has many', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: ['orders']
        });
        expect(count).to.equal(4);
        expect(result[2].orders.length).equal(3);
    });

    it('get multiple included things', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: ['companies', 'orders']
        });
        expect(result[0].orders).length(2);
        expect(result[0].orders).length(2);
    });

    it('sort included association', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: ['orders'],
            order: [
                [{relation: ['orders'], column: 'id'}, SortDirection.DESC]
            ]
        });
        expect(count).to.equal(4);
        expect(result[0].orders[0].id).to.equal(8);
    });

    it('sort double nested association', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: {
                association: 'orders',
                include: {
                    association: 'customer',
                    include: {
                        association: 'orders'
                    }
                }
            },
            order: [
                ['id', SortDirection.ASC],
                [{ relation: ['orders'], column: 'id' }, SortDirection.DESC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'status' }, SortDirection.ASC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'id' }, SortDirection.ASC]
            ]
        })
        expect(count).to.equal(4);
        expect(result[0].orders[0].customer.orders[0].id).to.equal(1);
    })

    it('sort double nested association with limit', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: {
                association: 'orders',
                include: {
                    association: 'customer',
                    include: {
                        association: 'orders'
                    }
                }
            },
            order: [
                ['id', SortDirection.ASC],
                [{ relation: ['orders'], column: 'id' }, SortDirection.DESC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'status' }, SortDirection.ASC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'id' }, SortDirection.ASC]
            ],
            limit: 2,
        })
        expect(count).to.equal(4);
        expect(result).length(2);
        expect(result[0].orders[0].customer.orders[0].id).to.equal(1);
    })

    it('include required has one association', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: {
                association: 'value',
                required: true
            }
        });
        expect(count).to.equal(2);
        expect(result).length(2);
    })

    it('include required has many association', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: {
                association: 'orders',
                required: true
            }
        })
        expect(count).to.equal(3);
        expect(result).length(3);
    });

    it('include required belongs to many association', async() => {
        const [result, count] = await orm.models.customer.findAll({
            include: {
                association: 'friends',
                required: true
            }
        });
        expect(count).to.equal(3);
        expect(result).length(3);
    });

    it('include required has many association with limit', async () => {
        const [result, count] = await orm.models.customer.findAll({
            include: {
                association: 'orders',
                required: true
            },
            limit: 1
        })
        expect(count).to.equal(3);
        expect(result).length(1);
    });

});
