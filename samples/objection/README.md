# Objection.js Library API

Library management REST API using **Objection.js + PostgreSQL**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Books | `GET /api/books` `GET /api/books/:id` `POST /api/books` `PUT /api/books/:id` `DELETE /api/books/:id` |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Swagger UI → http://localhost:3006/api-docs

## No-Database Mode

No PostgreSQL? **The server starts automatically using SQLite in-memory.** All routes work fully via Objection's database-agnostic query API.

```
[objection] Connected — using SQLite (in-memory)
```

## PostgreSQL Setup

Set these variables in `.env` to switch to PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swaggiffy_library
DB_USER=postgres
DB_PASSWORD=postgres
```

## Swaggiffy Integration

Objection models expose `static jsonSchema`, which Swaggiffy uses as the source of truth:

```ts
export class Book extends Model {
    static tableName = "books";
    static jsonSchema = {
        type: "object",
        required: ["title", "author"],
        properties: {
            id: { type: "integer" },
            title: { type: "string", minLength: 1, maxLength: 255 },
            author: { type: "string" },
            available: { type: "boolean", default: true },
        },
    };
}

registerSchema("Book", Book, { orm: "objection" });
```

`relationMappings` are recorded as `x-references`. If `jsonSchema` is omitted, Swaggiffy falls back to class inspection and logs a warning.

Objection's `insertAndFetch()` and `patchAndFetchById()` do a fetch after the mutation, which works across both PostgreSQL and SQLite without needing `RETURNING`.
