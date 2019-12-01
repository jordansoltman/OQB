import mysql from 'mysql';
import Knex from 'knex';
import { OQB, DataType, Model } from '../orm';


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

    await knex.schema.createTable('customer_value', (table) => {
        table.integer('customer_id').unsigned().references('customer.id').primary();
        table.integer('value');
    })

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
    })

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

    await knex('customer_value').insert([
        { customer_id: 3, value: 12 },
        { customer_id: 2, value: 15 }
    ])

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
    ])


    knex.destroy();
}

export async function resetDatabase() {
    await rebuildDatabase();
    await runMigrations();
}

export const orm = new OQB(TEST_CONFIG);

class Customer extends Model { 
    public static associate() {
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
Customer.init(orm, 'customer', {
    id: { primary: true, type: DataType.INTEGER, nullable: false },
    name: { primary: false, type: DataType.STRING, nullable: false },
    active: { primary: false, type: DataType.BOOLEAN, nullable: false },
}, { timeStamps: false });

class Order extends Model {
    public static associate() {
        Order.belongsTo({
            to: this.oqb.models.customer,
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


class Company extends Model {
    public static associate() {
        Company.belongsTo({
            to: this.oqb.models.customer,
            foreignKey: 'customer_id',
            as: 'customer'
        });
    }
}
Company.init(orm, 'company', {
    id: { primary: true, type: DataType.INTEGER, nullable: false },
    name: { type: DataType.STRING, nullable: false },
    customer_id: { type: DataType.INTEGER, nullable: false },
}, { timeStamps: false, softDeletes: true });

class Friend extends Model {}
Friend.init(orm, 'friend', {
    first_customer_id: { primary: true, type: DataType.INTEGER, nullable: false },
    second_customer_id: { primary: true, type: DataType.INTEGER, nullable: false }
}, { timeStamps: false });

class CustomerValue extends Model {}
CustomerValue.init(orm, 'customer_value', {
    customer_id: { primary: true, nullable: false, type: DataType.INTEGER },
    value: { type: DataType.INTEGER }
}, { timeStamps: false });




orm.associateAllModels();