import 'reflect-metadata';
import express from 'express';
import dotenv from 'dotenv';
import { Swaggiffy } from 'swaggiffy';

dotenv.config();

import { AppDataSource, dbMode } from './data-source';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { taskRouter } from './routes/task.routes';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/tasks', taskRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

async function bootstrap() {
    await AppDataSource.initialize();
    console.log(`[typeorm] Connected — using ${dbMode}`);
    app.listen(PORT, () => {
        console.log(`[typeorm] Server running on http://localhost:${PORT}`);
        console.log(`[typeorm] Swagger UI at http://localhost:${PORT}/api-docs`);
        if (dbMode.includes('SQLite')) console.log('[typeorm] Set DB_HOST in .env to use PostgreSQL instead');
    });
}

bootstrap().catch(console.error);
