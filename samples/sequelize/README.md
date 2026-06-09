# Sequelize Shop API

E-commerce REST API using **Sequelize + PostgreSQL**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Products | `GET /api/products` `GET /api/products/:id` `POST /api/products` `PUT /api/products/:id` `DELETE /api/products/:id` |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Swagger UI → http://localhost:3002/api-docs

## No-Database Mode

No PostgreSQL? **The server starts automatically using SQLite in-memory.** All routes work fully. Data resets on each restart since the storage is in-memory.

```
[sequelize] Connected — using SQLite (in-memory)
```

## PostgreSQL Setup

Set these variables in `.env` to switch to PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swaggiffy_shop
DB_USER=postgres
DB_PASSWORD=postgres
```

`sequelize.sync()` creates tables automatically — no manual migration needed.

## Swaggiffy Integration

```ts
// models/Product.ts — Sequelize rawAttributes contain column type metadata
registerSchema('Product', Product.rawAttributes, { orm: 'sequelize' });

// routes/product.routes.ts
registerDefinition(router, { basePath: '/api/products', mappedSchema: 'Product', tags: 'Products' });
```

Swaggiffy's `extractSequelize` reads each attribute's `.type.key` (e.g. `'STRING'`, `'INTEGER'`, `'DECIMAL'`) and maps it to the corresponding Swagger data type.
