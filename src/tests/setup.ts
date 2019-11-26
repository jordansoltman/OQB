import mysql from 'mysql';
import Knex from 'knex';
import { Orm, DataType } from '../orm';
import { Model } from '../orm/model';


const TEST_CONFIG = (process.env.NODE_ENV === 'travis') ? 
    {
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: '1247133182',
            database: 'ORM_TEST'
        }
    } : 
    {
        client: 'mysql',
        connection: {
            host: '127.0.0.1',
            user: 'travis',
            password: '',
            database: 'ORM_TEST'
        }
    }


async function rebuildDatabase() {
    const config = { ...TEST_CONFIG.connection };
    delete config.database;
    const connection = mysql.createConnection(config);

    return new Promise((resolve, reject) => {
        connection.connect((err) => {
            if (err) { return reject(err); }
            connection.query(`DROP DATABASE IF EXISTS ${TEST_CONFIG.connection.database}`, (err) => {
                if (err) { return reject(err); }
                connection.query(`CREATE DATABASE ${TEST_CONFIG.connection.database}`, (err) => {
                    if (err) { return reject(err); }
                    connection.destroy();
                    resolve();
                });
            });
        });
    })

}

async function runMigrations() {

    const knex = Knex(TEST_CONFIG);

    await knex.schema.createTable('customer', (table) => {
        table.increments('id');
        table.boolean('active');
        table.string('name');
    });

    await knex.schema.createTable('order', (table) => {
        table.increments('id');
        table.string('status');
        table.dateTime('order_date');
        table.integer('customer_id').unsigned().references('customer.id');
    });

    await knex.schema.createTable('customer_status', (table) => {
        table.increments('customer_id').primary();
        table.string('status')
    });

    knex.destroy();
}

export async function loadData() {
    const knex = Knex(TEST_CONFIG);

    await knex('customer').insert([
        { id: 1, name: 'Jordan', active: true },
        { id: 2, name: 'Madelyn', active: true },
        { id: 3, name: 'Brendan', active: true },
        { id: 4, name: 'Michael', active: true },
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

    await knex('customer_status').insert([
        { customer_id: 3, status: 'ACTIVE' },
        { customer_id: 4, status: 'SUSPENDED' }
    ]);

    knex.destroy();
}

export async function resetDatabase() {
    await rebuildDatabase();
    await runMigrations();
}

export const orm = new Orm(TEST_CONFIG);

class Customer extends Model { }
Customer.init(orm, 'customer', {
    id: { primary: true, type: DataType.INTEGER, nullable: false },
    name: { primary: false, type: DataType.STRING, nullable: false },
    active: { primary: false, type: DataType.BOOLEAN, nullable: false },
}, { timeStamps: false });

class Order extends Model {
    public static associate() {
        Order.belongsTo({
            to: this.orm.models.customer,
            foreignKey: 'customer_id',
            as: 'customer'
        });
    }
}
Order.init(orm, 'order', {
    id: { primary: true, type: DataType.INTEGER, nullable: false },
    status: { primary: false, type: DataType.STRING, nullable: false },
    order_date: { primary: false, type: DataType.DATETIME, nullable: false },
    customer_id: { primary: false, type: DataType.INTEGER, nullable: false }
}, { timeStamps: false })

orm.associateAllModels();
