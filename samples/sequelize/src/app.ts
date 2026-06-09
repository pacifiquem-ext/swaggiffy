import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { Swaggiffy } from "swaggiffy";

dotenv.config();

import { sequelize, dbMode } from "./db";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { productRouter } from "./routes/product.routes";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

async function bootstrap() {
    await sequelize.sync({ force: false });
    console.log(`[sequelize] Connected — using ${dbMode}`);
    app.listen(PORT, () => {
        console.log(`[sequelize] Server running on http://localhost:${PORT}`);
        console.log(`[sequelize] Swagger UI at http://localhost:${PORT}/api-docs`);
        if (dbMode.includes("SQLite")) console.log("[sequelize] Set DB_HOST in .env to use PostgreSQL instead");
    });
}

bootstrap().catch(console.error);
