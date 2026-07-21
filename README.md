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

`npx swaggiffy init -p PORT` writes `swaggiffy.config.json` and a starter spec file. The spec on disk is a **valid OpenAPI document** (not a swagger-jsdoc wrapper).

```json
{
   "projectName": "My API",
   "openApiVersion": "3.0",
   "outFile": "./swagger/swagger.json",
   "apiRoute": "/api-docs",
   "format": "json"
}
```

| Option | Values | Default | Effect |
|---|---|---|---|
| `openApiVersion` | `"3.0"` or `"2.0"` | `"3.0"` | OpenAPI 3 (`openapi: "3.0.0"`) or Swagger 2 (`swagger: "2.0"`) |
| `format` | `"json"` or `"yaml"` | `"json"` | File encoding. Pair with `outFile` (`swagger.json` / `swagger.yaml`) |
| `outFile` | path | `./swagger/swagger.json` | Where the spec is written |
| `apiRoute` | path | `/api-docs` | Where swagger-ui is mounted |

Generate just the config or just the spec:

```bash
npx swaggiffy generate:config
npx swaggiffy generate:spec
```

**Upgrading from an older Swaggiffy:** if your existing file still has a top-level `swaggerDefinition` key, the UI keeps working but a **yellow deprecation warning** is printed at startup. Delete the file (or regenerate) so a valid OpenAPI document is written.

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

API paths are generated from Express routers. Path parameters are inferred from `:id` style keys. Query, header, cookie, and form fields are declared on the options object — Express does not carry those definitions.

```js
import { registerDefinition, registerDefinitions } from 'swaggiffy';

// Public route — no security field is written
registerDefinition(authRouter, {
    tags: 'Auth',
    mappedSchema: 'User',
    basePath: '/api/auth',
    summary: 'Authentication (public)',
});

// Protected routes — security is only emitted when you pass it
registerDefinition(userRouter, {
    tags: 'Users',
    mappedSchema: 'User',
    basePath: '/api/users',
    summary: 'User management',
    description: 'Requires a Bearer JWT from /api/auth/login.',
    security: [{ bearerAuth: [] }],
    parameters: [
        { in: 'header', name: 'X-Request-ID', required: false, type: 'string' },
        { in: 'query', name: 'q', required: false, type: 'string', description: 'Search' },
    ],
});

registerDefinitions([
    { router: productRouter, options: { tags: 'Products', mappedSchema: 'Product', basePath: '/api/products' } },
    { router: itemRouter, options: { tags: 'Items', mappedSchema: 'Item', basePath: '/api/items' } },
]);
```

- `security` is optional. If omitted, the operation has **no** `security` field (no hardcoded `Bearer` / `["global"]` scopes).
- POST / PUT / PATCH get a JSON body. In OpenAPI 3 that is `requestBody`; in Swagger 2 it stays `in: body`.
- `parameters` with `in: "formData"` become `requestBody` + `multipart/form-data` in v3, and stay `formData` parameters in v2.

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
    "ignore": ["*swagger.json", "*swagger.yaml"]
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
