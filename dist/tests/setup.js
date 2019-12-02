"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("mysql"));
const knex_1 = __importDefault(require("knex"));
const orm_1 = require("../orm");
const TEST_CONFIG = (process.env.NODE_ENV === 'travis') ?
    {
        client: 'mysql',
        connection: {
            host: '127.0.0.1',
            user: 'travis',
            password: '',
            database: 'ORM_TEST'
        }
    } :
    {
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: '1247133182',
            database: 'ORM_TEST'
        }
    };
async function rebuildDatabase() {
    const config = Object.assign({}, TEST_CONFIG.connection);
    delete config.database;
    const connection = mysql_1.default.createConnection(config);
    return new Promise((resolve, reject) => {
        connection.connect((err) => {
            if (err) {
                return reject(err);
            }
            connection.query(`DROP DATABASE IF EXISTS ${TEST_CONFIG.connection.database}`, (err) => {
                if (err) {
                    return reject(err);
                }
                connection.query(`CREATE DATABASE ${TEST_CONFIG.connection.database}`, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    connection.destroy();
                    resolve();
                });
            });
        });
    });
}
async function runMigrations() {
    const knex = knex_1.default(TEST_CONFIG);
    await knex.schema.createTable('customer', (table) => {
        table.increments('id');
        table.boolean('active');
        table.string('name');
    });
    await knex.schema.createTable('customer_value', (table) => {
        table.integer('customer_id').unsigned().references('customer.id').primary();
        table.integer('value');
    });
    await knex.schema.createTable('company', (table) => {
        table.increments('id');
        table.string('name');
        table.integer('customer_id').unsigned().references('customer.id');
        table.dateTime('deleted_at');
    });
    await knex.schema.createTable('order', (table) => {
        table.increments('id');
        table.string('status');
        table.dateTime('order_date');
        table.integer('customer_id').unsigned().references('customer.id');
    });
    await knex.schema.createTable('friend', (table) => {
        table.integer('first_customer_id').unsigned().references('customer.id');
        table.integer('second_customer_id').unsigned().references('second_customer_id');
    });
    knex.destroy();
}
async function loadData() {
    const knex = knex_1.default(TEST_CONFIG);
    await knex('customer').insert([
        { id: 1, name: 'Jordan', active: true },
        { id: 2, name: 'Madelyn', active: true },
        { id: 3, name: 'Brendan', active: true },
        { id: 4, name: 'Michael', active: true },
    ]);
    await knex('customer_value').insert([
        { customer_id: 3, value: 12 },
        { customer_id: 2, value: 15 }
    ]);
    await knex('company').insert([
        { id: 1, name: 'Walmart', customer_id: 1, deleted_at: null },
        { id: 2, name: 'Target', customer_id: 1, deleted_at: null },
        { id: 3, name: 'Walgreens', customer_id: 2, deleted_at: null },
        { id: 4, name: 'Amazon', customer_id: 3, deleted_at: new Date(2018) },
    ]);
    await knex('order').insert([
        { id: 1, status: 'COMPLETE', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 1 },
        { id: 2, status: 'SHIPPED', order_date: new Date(2019, 10, 6, 6, 5), customer_id: 1 },
        { id: 3, status: 'COMPLETE', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 2 },
        { id: 4, status: 'COMPLETE', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 2 },
        { id: 5, status: 'SHIPPED', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 2 },
        { id: 6, status: 'COMPLETE', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 3 },
        { id: 7, status: 'PLACED', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 3 },
        { id: 8, status: 'PLACED', order_date: new Date(2019, 10, 3, 10, 5), customer_id: 3 },
    ]);
    await knex('friend').insert([
        { first_customer_id: 1, second_customer_id: 2 },
        { first_customer_id: 1, second_customer_id: 3 },
        { first_customer_id: 2, second_customer_id: 3 },
        { first_customer_id: 2, second_customer_id: 4 },
        { first_customer_id: 3, second_customer_id: 3 }
    ]);
    knex.destroy();
}
exports.loadData = loadData;
async function resetDatabase() {
    await rebuildDatabase();
    await runMigrations();
}
exports.resetDatabase = resetDatabase;
exports.orm = new orm_1.OQB(TEST_CONFIG);
class Customer extends orm_1.Model {
    static associate() {
        Customer.hasOne({
            as: 'value',
            foreignKey: 'customer_id',
            to: this.oqb.models.customer_value
        });
        Customer.hasMany({
            as: 'orders',
            foreignKey: 'customer_id',
            to: this.oqb.models.order
        });
        Customer.hasMany({
            as: 'companies',
            foreignKey: 'customer_id',
            to: this.oqb.models.company
        });
        Customer.belongsToMany({
            to: this.oqb.models.customer,
            toKey: 'second_customer_id',
            fromKey: 'first_customer_id',
            through: this.oqb.models.friend,
            as: 'friends'
        });
    }
}
Customer.init(exports.orm, 'customer', {
    id: { primary: true, type: orm_1.DataType.INTEGER, nullable: false },
    name: { primary: false, type: orm_1.DataType.STRING, nullable: false },
    active: { primary: false, type: orm_1.DataType.BOOLEAN, nullable: false },
}, { timeStamps: false });
class Order extends orm_1.Model {
    static associate() {
        Order.belongsTo({
            to: this.oqb.models.customer,
            foreignKey: 'customer_id',
            as: 'customer'
        });
    }
}
Order.init(exports.orm, 'order', {
    id: { primary: true, type: orm_1.DataType.INTEGER, nullable: false },
    status: { primary: false, type: orm_1.DataType.STRING, nullable: false },
    order_date: { primary: false, type: orm_1.DataType.DATETIME, nullable: false },
    customer_id: { primary: false, type: orm_1.DataType.INTEGER, nullable: false }
}, { timeStamps: false });
class Company extends orm_1.Model {
    static associate() {
        Company.belongsTo({
            to: this.oqb.models.customer,
            foreignKey: 'customer_id',
            as: 'customer'
        });
    }
}
Company.init(exports.orm, 'company', {
    id: { primary: true, type: orm_1.DataType.INTEGER, nullable: false },
    name: { type: orm_1.DataType.STRING, nullable: false },
    customer_id: { type: orm_1.DataType.INTEGER, nullable: false },
}, { timeStamps: false, softDeletes: true });
class Friend extends orm_1.Model {
}
Friend.init(exports.orm, 'friend', {
    first_customer_id: { primary: true, type: orm_1.DataType.INTEGER, nullable: false },
    second_customer_id: { primary: true, type: orm_1.DataType.INTEGER, nullable: false }
}, { timeStamps: false });
class CustomerValue extends orm_1.Model {
}
CustomerValue.init(exports.orm, 'customer_value', {
    customer_id: { primary: true, nullable: false, type: orm_1.DataType.INTEGER },
    value: { type: orm_1.DataType.INTEGER }
}, { timeStamps: false });
exports.orm.associateAllModels();
//# sourceMappingURL=setup.js.map