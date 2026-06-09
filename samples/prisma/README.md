# Prisma CMS API

Content management REST API using **Prisma + SQLite/PostgreSQL**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Articles | `GET /api/articles` `GET /api/articles/:id` `POST /api/articles` `PUT /api/articles/:id` `DELETE /api/articles/:id` |

## Quick Start

```bash
cp .env.example .env          # DATABASE_URL=file:./dev.db by default
npm install
npm run db:generate            # generate Prisma Client
npm run db:push                # create dev.db (SQLite, no server needed)
npm run dev
```

Swagger UI → http://localhost:3004/api-docs

## No-Database Mode

The default config uses **SQLite** (`file:./dev.db`) — no Postgres server needed. Just run `db:generate` + `db:push` once and you're done.

## PostgreSQL Setup

1. Update `prisma/schema.prisma`: change `provider = "sqlite"` → `provider = "postgresql"`
2. Update `.env`: set `DATABASE_URL=postgresql://user:pass@localhost:5432/swaggiffy_cms`
3. Re-run `npm run db:generate && npm run db:push`

## Swaggiffy Integration

Prisma generates TypeScript types (not inspectable classes), so Swaggiffy schemas are registered using plain TypeScript classes with the `@Schema()` decorator:

```ts
// src/schemas/Article.ts
@Schema('Article')
export class ArticleSchema {
    id: number = 0;
    title: string = '';
    content: string = '';
    published: boolean = false;
    authorId: number = 0;
}
```

These are imported in `app.ts` before `swaggiffy()` is called, ensuring the schemas are registered in the global store before Swaggiffy reads them.
