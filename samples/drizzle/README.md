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

Pass the Drizzle table objects themselves — Swaggiffy reads `notNull()`, `default()`, `varchar({ length })`, and `.references()`:

```ts
// src/schema.ts — runs at import time
registerSchema("User", users, { orm: "drizzle" });
registerSchema("Event", events, { orm: "drizzle" });
```

`title` becomes `string` + `maxLength: 255` + required; `capacity` keeps `default: 100`; `userId` is documented as a foreign key to `users.id`. `GET /api/events` documents `published` and `q` query parameters.

`app.ts` imports `./schema` before calling `swaggiffy()`, which ensures the schema store is populated before Swaggiffy reads it and writes `swagger.json`.
