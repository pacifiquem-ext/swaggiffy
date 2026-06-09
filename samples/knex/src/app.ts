import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { Swaggiffy } from "swaggiffy";

dotenv.config();

import "./schemas/User";
import "./schemas/Item";
import { setupTables, dbMode } from "./db";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { itemRouter } from "./routes/item.routes";

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/items", itemRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

async function bootstrap() {
    await setupTables();
    console.log(`[knex] Connected — using ${dbMode}`);
    app.listen(PORT, () => {
        console.log(`[knex] Server running on http://localhost:${PORT}`);
        console.log(`[knex] Swagger UI at http://localhost:${PORT}/api-docs`);
        if (dbMode.includes("SQLite")) console.log("[knex] Set DB_HOST in .env to use PostgreSQL instead");
    });
}

bootstrap().catch(console.error);
