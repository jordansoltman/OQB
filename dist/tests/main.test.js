"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const setup_1 = require("./setup");
const types_1 = require("../orm/types");
before(async () => {
    await setup_1.resetDatabase();
    await setup_1.loadData();
});
after(async () => {
    setup_1.orm.knex.destroy();
});
describe('Find All Query Selection', () => {
    it('can select all objects', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll();
        chai_1.expect(count).equal(4);
        chai_1.expect(result.length).equal(4);
    });
    it('can order by a column asc', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            order: [['name', types_1.SortDirection.ASC]]
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result.length).equal(4);
        chai_1.expect(result[0].name).equal('Brendan');
    });
    it('can order by a column desc', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            order: [['name', types_1.SortDirection.DESC]]
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result.length).equal(4);
        chai_1.expect(result[0].name).equal('Michael');
    });
    it('should ignore things that have been soft deleted by default', async () => {
        const [result, count] = await setup_1.orm.models.company.findAll();
        chai_1.expect(result).length(3);
        chai_1.expect(count).equal(3);
    });
    it('should include soft deleted entries when include soft delete when includeSoftDeleted flag is set', async () => {
        const [result, count] = await setup_1.orm.models.company.findAll({ includeSoftDeleted: true });
        chai_1.expect(result).length(4);
        chai_1.expect(count).equal(4);
    });
    it('get included belongs to many', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({ include: 'friends' });
        chai_1.expect(result).length(4);
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result[0].friends).length(2);
    });
    it('get included has one', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: 'value'
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result[0].value).to.not.equal(null);
        chai_1.expect(result[2].value).to.equal(null);
    });
    it('get included has many', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: ['orders']
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result[2].orders.length).equal(3);
    });
    it('get multiple included things', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: ['companies', 'orders']
        });
        chai_1.expect(result[0].orders).length(2);
        chai_1.expect(result[0].orders).length(2);
    });
    it('sort included association', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: ['orders'],
            order: [
                [{ relation: ['orders'], column: 'id' }, types_1.SortDirection.DESC]
            ]
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result[0].orders[0].id).to.equal(8);
    });
    it('sort double nested association', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
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
                ['id', types_1.SortDirection.ASC],
                [{ relation: ['orders'], column: 'id' }, types_1.SortDirection.DESC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'status' }, types_1.SortDirection.ASC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'id' }, types_1.SortDirection.ASC]
            ]
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result[0].orders[0].customer.orders[0].id).to.equal(1);
    });
    it('sort double nested association with limit', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
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
                ['id', types_1.SortDirection.ASC],
                [{ relation: ['orders'], column: 'id' }, types_1.SortDirection.DESC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'status' }, types_1.SortDirection.ASC],
                [{ relation: ['orders', 'customer', 'orders'], column: 'id' }, types_1.SortDirection.ASC]
            ],
            limit: 2,
        });
        chai_1.expect(count).to.equal(4);
        chai_1.expect(result).length(2);
        chai_1.expect(result[0].orders[0].customer.orders[0].id).to.equal(1);
    });
    it('include required has one association', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: {
                association: 'value',
                required: true
            }
        });
        chai_1.expect(count).to.equal(2);
        chai_1.expect(result).length(2);
    });
    it('include required has many association', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: {
                association: 'orders',
                required: true
            }
        });
        chai_1.expect(count).to.equal(3);
        chai_1.expect(result).length(3);
    });
    it('include required belongs to many association', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: {
                association: 'friends',
                required: true
            }
        });
        chai_1.expect(count).to.equal(3);
        chai_1.expect(result).length(3);
    });
    it('include required has many association with limit', async () => {
        const [result, count] = await setup_1.orm.models.customer.findAll({
            include: {
                association: 'orders',
                required: true
            },
            limit: 1
        });
        chai_1.expect(count).to.equal(3);
        chai_1.expect(result).length(1);
    });
});
//# sourceMappingURL=main.test.js.map