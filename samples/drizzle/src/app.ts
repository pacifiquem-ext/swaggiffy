import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { Swaggiffy } from "swaggiffy";

dotenv.config();

import "./schema";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { eventRouter } from "./routes/event.routes";

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/events", eventRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

app.listen(PORT, () => {
    console.log(`[drizzle] Server running on http://localhost:${PORT}`);
    console.log(`[drizzle] Swagger UI at http://localhost:${PORT}/api-docs`);
    console.log(`[drizzle] Run 'npm run db:push' first if tables don't exist`);
});
