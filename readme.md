# OQB - Object Query Builder

### Why another ORM?

First off, this project is not aiming to be a full featured ORM. It was born out of the need to get nested JSON objects from a MySQL database without writing a ton of redundant code. It was built because many existing ORMs did not meet the needs of my projects, namely first class support for soft deletes, typescript support, and composite keys. It's heavily influenced by Sequelize, built on top of knex.js and a custom version of NestHydration.

### The State of the Project

The project is mostly written for my own uses. If anyone happens across this and wants to add featuers I'm open to pull requests. I update it semi-frequently as I need new features and as bugs are discovered. It's **not** fully tested, I'm slowly adding in tests as I go. It is only tested with MySQL, but as it's built on top of knex.js it's plausible it will work with other databases.

## Usage

### Initialization

A OQB object is initialzed with a knex config object. See [the knex.js docs for details](http://knexjs.org/#Installation-client).

```
const oqb = new OQB({
  client: 'mysql',
  connection: {
    host : '127.0.0.1',
    user : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
});
```

### Model Definition

Model defintions are a bit clunky right now, but may be improved in the future. Classes extend models, and then are initialized.

```
class Company extends Model {}
Company.init(oqb, 'company', {
    id: { primary: true, type: DataType.INTEGER },
    name: { type: DataType.STRING },
    customer_id: { type: DataType.INTEGER },
}, { timeStamps: false, softDeletes: true });
```
Models are initialied with four arguments, the first being a reference to the OQB instance, the second being the name of the table, and the third being a column definition for the table. Each field in the column definition must have a DataType and optionally a primary property. A model can have multiple primary fields to form a composite key. The final argument are the options. By default timestamps are true (two columns called created_at and updated_at) that are automatically updated. The other option is for soft deleting which is by default false. This allows records to be deleted by setting a timestamp instead of actually removing the record.

### Associations

Models support associations by declaring a static associate method.

```
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
        Customer.belongsToMany({
            to: this.oqb.models.customer,
            toKey: 'second_customer_id',
            fromKey: 'first_customer_id',
            through: this.oqb.models.friend,
            as: 'friends'
        });
    }
}
```

There are four different types of associations: hasOne, hasMany, belongsTo, and belongsToMany.

After defining all of the models, you need to call: `oqb.associateAllModels()`. This **must** be called after all of the models have been defined.

### Selecting models

Models are selected using the `findAll()` method. For example:

```
await customers = oqb.models.customer.findAll();
```

**...docs to be continued***