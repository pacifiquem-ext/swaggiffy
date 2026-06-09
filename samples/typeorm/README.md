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

The `@Schema()` decorator and TypeORM's `@Entity()` decorator are stacked on the same class. This works because Swaggiffy instantiates the class (`new User()`) and reads own-property default values — independent of TypeORM's metadata.

```ts
@Schema('Task')   // Swaggiffy reads: id=0, title='', completed=false, ...
@Entity('tasks')  // TypeORM maps to SQL table
export class Task {
    @PrimaryGeneratedColumn() id: number = 0;
    @Column()                 title: string = '';
    @Column({ default: false }) completed: boolean = false;
}
```

Default values on class fields are what allow `@Schema()` to infer types at runtime.
