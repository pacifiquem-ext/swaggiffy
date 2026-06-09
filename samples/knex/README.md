# Knex Inventory API

Inventory management REST API using **Knex query builder + PostgreSQL**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Items | `GET /api/items` `GET /api/items/:id` `POST /api/items` `PUT /api/items/:id` `DELETE /api/items/:id` |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Swagger UI → http://localhost:3005/api-docs

## No-Database Mode

No PostgreSQL? **The server starts automatically using SQLite in-memory.** `setupTables()` runs on startup and creates the schema inside SQLite. All routes work fully.

```
[knex] Connected — using SQLite (in-memory)
```

> Note: `sqlite3` is resolved from the root `swaggiffy/node_modules` via Node's module resolution — no extra install needed.

## PostgreSQL Setup

Set these variables in `.env` to switch to PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swaggiffy_inventory
DB_USER=postgres
DB_PASSWORD=postgres
```

## Swaggiffy Integration

Knex has no model classes, so schemas are registered with plain JavaScript objects that represent the row shape:

```ts
// src/schemas/Item.ts
registerSchema('Item', {
    id: 0,
    name: '',
    description: '',
    quantity: 0,
    price: 0,
    userId: 0,
});
```

Swaggiffy's `extractPlain` reads `typeof value` for each key and maps it to a Swagger type. The `db.ts` file exports `dbInsert` / `dbUpdateOne` helpers that abstract the difference between PostgreSQL's `RETURNING` clause and SQLite's two-step insert-then-select.
