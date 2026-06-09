import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { Swaggiffy } from "swaggiffy";

dotenv.config();

import { setupTables, dbMode } from "./db";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { bookRouter } from "./routes/book.routes";

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/books", bookRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

async function bootstrap() {
    await setupTables();
    console.log(`[objection] Connected — using ${dbMode}`);
    app.listen(PORT, () => {
        console.log(`[objection] Server running on http://localhost:${PORT}`);
        console.log(`[objection] Swagger UI at http://localhost:${PORT}/api-docs`);
        if (dbMode.includes("SQLite")) console.log("[objection] Set DB_HOST in .env to use PostgreSQL instead");
    });
}

bootstrap().catch(console.error);
