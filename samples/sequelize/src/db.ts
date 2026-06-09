import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const useSQLite = !process.env.DB_HOST;

export const sequelize = useSQLite
    ? new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false })
    : new Sequelize({
          dialect: "postgres",
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || "swaggiffy_shop",
          username: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD || "postgres",
          logging: false,
      });

export const dbMode = useSQLite ? "SQLite (in-memory)" : "PostgreSQL";
