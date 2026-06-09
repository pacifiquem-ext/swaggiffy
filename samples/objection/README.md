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

Objection models are plain classes that extend `Model`, which makes them compatible with Swaggiffy's `@Schema()` decorator. Swaggiffy instantiates the class and reads the default property values:

```ts
@Schema('Book')           // Swaggiffy reads: id=0, title='', author='', ...
export class Book extends Model {
    static tableName = 'books';
    id: number = 0;
    title: string = '';
    author: string = '';
    isbn: string = '';
    year: number = 0;
    available: boolean = true;
}
```

Objection's `insertAndFetch()` and `patchAndFetchById()` do a fetch after the mutation, which works across both PostgreSQL and SQLite without needing `RETURNING`.
