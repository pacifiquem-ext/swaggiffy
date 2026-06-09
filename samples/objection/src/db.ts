import Knex from 'knex';
import { Model } from 'objection';
import dotenv from 'dotenv';

dotenv.config();

const useSQLite = !process.env.DB_HOST;

const knex = useSQLite
    ? Knex({ client: 'sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true })
    : Knex({
          client: 'pg',
          connection: {
              host: process.env.DB_HOST || 'localhost',
              port: Number(process.env.DB_PORT) || 5432,
              database: process.env.DB_NAME || 'swaggiffy_library',
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || 'postgres',
          },
      });

Model.knex(knex);

export { knex };
export const dbMode = useSQLite ? 'SQLite (in-memory)' : 'PostgreSQL';

export async function setupTables() {
    const hasUsers = await knex.schema.hasTable('users');
    if (!hasUsers) {
        await knex.schema.createTable('users', (t) => {
            t.increments('id').primary();
            t.string('name').notNullable();
            t.string('email').notNullable().unique();
            t.string('password').notNullable();
            t.timestamps(true, true);
        });
    }

    const hasBooks = await knex.schema.hasTable('books');
    if (!hasBooks) {
        await knex.schema.createTable('books', (t) => {
            t.increments('id').primary();
            t.string('title').notNullable();
            t.string('author').notNullable();
            t.string('isbn').unique();
            t.integer('year');
            t.boolean('available').defaultTo(true);
            t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
            t.timestamps(true, true);
        });
    }
}
