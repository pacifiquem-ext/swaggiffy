# SWAGGIFY

Swaggiffy is a zero config opensource tool for documenting your Node.js Express APIs and is built on top of Swagger. It is designed to be easy to use and simple, with the goal that anyone can read it. <br>

## Features

-   Automated Swagger Schema Registry.
-   Automated Swagger API Definition Registry.
-   Automatic Swagger file rendering.
-   Clean and Simple Config file.
-   Supports both OpenAPI 2 and OpenAPI 3.
-   Supports for Typescript Classes.
-   Support for Mongoose ORM Schema Objects.
-   ORM-aware schema extraction for Mongoose, Sequelize, TypeORM, Prisma, Knex, Objection, and Drizzle.
-   Support for Swagger YAML and JSON.
-   Rich CLI.
-   Built on top on Express and Swagger.

And more ...

## Get started

### Install

```bash
npm i swaggiffy #npm
yarn add swaggiffy #yarn
pnpm add swaggiffy #pnpm
```

### Swaggify Configuration

Swaggify creates a clean and simple configuration file. In addition, it create a swagger definition file,
to your preffered path specified in the configuration file.

This is will generate both `swaggiffy.config.json` and `swagger/swagger.json` files.

```bash
npx swaggiffy init -p PORT
```

Generate the config file only.

```bash
npx swaggiffy generate:config
```

Generate the spec file only.

```bash
npx swaggiffy generate:spec
```

### Instantiate Swaggify

In your main .js or .ts file.

```js
const { Swaggiffy } = require('swaggiffy'); // Using require
import { Swaggiffy } from 'swaggiffy'; // Using import
```

Build Swaggiffy with your express app.

```js
new Swaggiffy().setupExpress(app).swaggiffy();
```

### Using Swaggiffy

#### Schema Registry

To register a schema

```js
import { registerSchema, registerSchemas } from 'swaggiffy';

// Canonical form: name, class/object, { orm }
registerSchema('User', userSchema, { orm: 'mongoose' });
registerSchema('Product', Product.rawAttributes, { orm: 'sequelize' });
registerSchema('Task', Task, { orm: 'typeorm' });
registerSchema('Article', Prisma /* or a DMMF model */, { orm: 'prisma' });
registerSchema('Item', knexItemDescriptor, { orm: 'knex' });
registerSchema('Book', Book, { orm: 'objection' });
registerSchema('Event', events, { orm: 'drizzle' });

// Plain objects still work, but are lossy (type only — no nullability, defaults, or FKs)
registerSchema('Model Name 1', { id: 0, name: '' });

registerSchemas([
    { name: 'User', schema: userSchema, options: { orm: 'mongoose' } },
    { name: 'Event', schema: events, options: { orm: 'drizzle' } },
]);
```

#### Supported ORMs

| `orm` | What you pass | Metadata captured |
|---|---|---|
| `mongoose` | `mongoose.Schema` or Model | types, `required`, `default`, `min`/`max`, `minlength`/`maxlength`, `enum`, `ref` |
| `sequelize` | Model class or `rawAttributes` | types, `allowNull` → `required`, `defaultValue`, `STRING(n)` → `maxLength`, FK `references` |
| `typeorm` | `@Entity` class | `@Column` / `@PrimaryGeneratedColumn` / `@CreateDateColumn` types, `nullable`, `default`, `length`, relations |
| `prisma` | DMMF model, `Prisma` namespace, or `{ fields: [...] }` | scalar types, `isRequired`, `@default`, relations |
| `knex` | Column descriptor object | `type`, `notNull`, `maxLength`, `default`, `references` |
| `objection` | Model class | `static jsonSchema` (preferred) plus `relationMappings`; warns if `jsonSchema` is missing |
| `drizzle` | `pgTable` / `mysqlTable` / `sqliteTable` | types, `notNull()`, `default()` / `defaultNow()`, `varchar({ length })`, `.references()` |

Passing an unsupported `orm` string throws. Omitting `orm` on a plain object or class logs a warning and falls back to basic `typeof` inspection.

The generated spec is a **valid OpenAPI document** (default `openapi: "3.0.x"`). Set `openApiVersion: "2.0"` in `swaggiffy.config.json` for Swagger 2, and `format: "yaml"` for YAML output. Per-route `security` is only written when you pass it on `registerDefinition` — public routes stay public. If an old swagger-jsdoc wrapper file is detected at startup, Swaggiffy serves it and prints a yellow deprecation warning; regenerate the spec to clear it.

For classes use

```js
import { Schema } from 'swaggiffy';

@Schema('Model')
class Model {
    property1 = '';
    property2 = '';
    property3 = '';
}
```

#### API Definition Registry

We generate API Definition from Express Routers.

`tags`: Tags are swagger groupings
`mappedSchema`: Maps the desired schema registered in swagger to your API Definition.
`basePath`: Base Paths specifies the route for your router.

```js
import { registerDefinition, registerDefinitions } from 'swaggiffy';

registerDefinition(router, { tags: 'Products', mappedSchema: 'Product', basePath: '/products' });

registerDefinitions([
    router1,
    { tags: 'Products', mappedSchema: 'Product', basePath: '/products' },
    router2,
    { tags: 'Users', mappedSchema: 'User', basePath: '/user' },
]);
```

#### Run the App

```bash
node app.js
```

With nodemon we need to exclude files

```bash
nodemon --ignore '*swagger.json' app.js
```

or create a `nodemon.json` file with

```json
{
    "ignore": ["*swagger.json"]
}
```

Tada!, Now access `localhost:PORT/api-docs` to see swagger 😁.

### DEMO

Checkout this repository for demo and additional examples.
[Swaggiffy Samples](https://github.com/divinirakiza/swaggify-samples)

### CONTRIBUTIONS

You are welcome for contributions. Please read our [CONTRIBUTING.md](https://github.com/divinirakiza/swaggiffy/blob/main/CONTRIBUTING.md) file.

### MAINTAINERS

-   Divin Irakiza ([@divinirakiza](https://github.com/divinirakiza))
