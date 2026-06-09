# Drizzle Events API

Events management REST API using **Drizzle ORM + PostgreSQL**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Events | `GET /api/events` `GET /api/events/:id` `POST /api/events` `PUT /api/events/:id` `DELETE /api/events/:id` |

## Quick Start

```bash
cp .env.example .env
npm install
npm run db:push                # push schema to PostgreSQL
npm run dev
```

Swagger UI → http://localhost:3007/api-docs

## No-Database Mode

The Drizzle `pg` pool connects lazily — **the server starts and Swagger docs load regardless of database availability.** If PostgreSQL is not running, route handlers return `500` with the connection error message.

To run fully without a database server, substitute a local PostgreSQL or use the `DATABASE_URL` of a free cloud Postgres (e.g. Neon, Supabase).

## PostgreSQL Setup

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/swaggiffy_events
```

Run `npm run db:push` once to create the tables using Drizzle Kit.

## Swaggiffy Integration

Drizzle uses table builder functions (`pgTable`) rather than class instances, so schemas are registered using plain JavaScript objects that mirror the table shape:

```ts
// src/schema.ts — runs at import time
registerSchema('Event', {
    id: 0,
    title: '',
    description: '',
    location: '',
    date: new Date(),
    capacity: 0,
    published: false,
    userId: 0,
});
```

`app.ts` imports `./schema` before calling `swaggiffy()`, which ensures the schema store is populated before Swaggiffy reads it and writes `swagger.json`.
