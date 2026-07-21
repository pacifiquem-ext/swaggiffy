# TypeORM Task Manager API

Task management REST API using **TypeORM + PostgreSQL**, documented by local Swaggiffy.

## Resources

| Tag | Endpoints |
|-----|-----------|
| Auth | `POST /api/auth/register` `POST /api/auth/login` |
| Users | `GET /api/users` `GET /api/users/:id` `PUT /api/users/:id` `DELETE /api/users/:id` |
| Tasks | `GET /api/tasks` `GET /api/tasks/:id` `POST /api/tasks` `PUT /api/tasks/:id` `DELETE /api/tasks/:id` |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Swagger UI → http://localhost:3003/api-docs

## No-Database Mode

No PostgreSQL? **The server starts automatically using SQLite in-memory.** TypeORM's `synchronize: true` creates the schema on the fly. All routes work fully.

```
[typeorm] Connected — using SQLite (in-memory)
```

## PostgreSQL Setup

Set these variables in `.env` to switch to PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swaggiffy_tasks
DB_USER=postgres
DB_PASSWORD=postgres
```

## Swaggiffy Integration

Register the TypeORM entity class. Swaggiffy reads decorator metadata (`@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, relations):

```ts
@Entity("tasks")
export class Task {
    @PrimaryGeneratedColumn() id: number = 0;
    @Column() title: string = "";
    @Column({ nullable: true }) description: string = "";
    @Column({ default: false }) completed: boolean = false;
    @ManyToOne(() => User) user?: User;
}

registerSchema("Task", Task, { orm: "typeorm" });
```

`nullable`, `default`, `length`, and relations show up on the generated OpenAPI schema. Import `reflect-metadata` before the entity files.
