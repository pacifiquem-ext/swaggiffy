# Mongoose Blog API

Blog REST API using **Mongoose + MongoDB**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Posts | `GET /api/posts` `GET /api/posts/:id` `POST /api/posts` `PUT /api/posts/:id` `DELETE /api/posts/:id` |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Swagger UI → http://localhost:3001/api-docs

## No-Database Mode

No MongoDB? **The server still starts.** Routes return `503 Database unavailable` until a connection is established. Swagger docs are always accessible.

To enable the database, set `MONGODB_URI` in `.env` and restart.

## Database Setup

```env
MONGODB_URI=mongodb://localhost:27017/swaggiffy_blog
```

Mongoose creates collections automatically on first use — no migration needed.

## Swaggiffy Integration

```ts
// models/User.ts — schema registered at import time
registerSchema('User', userSchema, { orm: 'mongoose' });

// routes/post.routes.ts — routes documented at module level (after all router.get/post calls)
registerDefinition(router, { basePath: '/api/posts', mappedSchema: 'Post', tags: 'Posts' });

// app.ts — wires everything together
new Swaggiffy().setupExpress(app).swaggiffy();
```

Swaggiffy reads `swaggiffy.config.json` for the output path and API route, introspects the Mongoose Schema `paths` map to build type definitions, and walks the Express router stack to generate path entries.
