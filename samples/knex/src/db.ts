import Knex from "knex";
import dotenv from "dotenv";

dotenv.config();

export const isSQLite = !process.env.DB_HOST;

export const db = isSQLite
    ? Knex({ client: "sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true })
    : Knex({
          client: "pg",
          connection: {
              host: process.env.DB_HOST || "localhost",
              port: Number(process.env.DB_PORT) || 5432,
              database: process.env.DB_NAME || "swaggiffy_inventory",
              user: process.env.DB_USER || "postgres",
              password: process.env.DB_PASSWORD || "postgres",
          },
      });

export const dbMode = isSQLite ? "SQLite (in-memory)" : "PostgreSQL";

/** Insert a row and return it. Handles RETURNING differences between PG and SQLite. */
export async function dbInsert(table: string, data: Record<string, any>, select = "*"): Promise<any> {
    if (isSQLite) {
        const [id] = await db(table).insert(data);
        return db(table).where({ id }).select(select).first();
    }
    const [row] = await db(table).insert(data).returning(select);
    return row;
}

/** Update a row and return the updated version. */
export async function dbUpdateOne(table: string, where: Record<string, any>, data: Record<string, any>, select = "*"): Promise<any> {
    await db(table).where(where).update(data);
    return db(table).where(where).select(select).first() ?? null;
}

export async function setupTables() {
    const hasUsers = await db.schema.hasTable("users");
    if (!hasUsers) {
        await db.schema.createTable("users", (t) => {
            t.increments("id").primary();
            t.string("name").notNullable();
            t.string("email").notNullable().unique();
            t.string("password").notNullable();
            t.timestamps(true, true);
        });
    }

    const hasItems = await db.schema.hasTable("items");
    if (!hasItems) {
        await db.schema.createTable("items", (t) => {
            t.increments("id").primary();
            t.string("name").notNullable();
            t.text("description");
            t.integer("quantity").defaultTo(0);
            t.decimal("price", 10, 2).notNullable();
            t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
            t.timestamps(true, true);
        });
    }
}
