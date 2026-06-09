import 'reflect-metadata';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Swaggiffy } from 'swaggiffy';

dotenv.config();

import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { postRouter } from './routes/post.routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

let dbConnected = false;

export function isDbConnected() {
    return dbConnected;
}

async function bootstrap() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swaggiffy_blog');
        dbConnected = true;
        console.log('[mongoose] Connected to MongoDB');
    } catch (err: any) {
        console.warn(`[mongoose] WARNING: MongoDB unavailable (${err.message})`);
        console.warn('[mongoose] Server will start in degraded mode — database routes return 503');
    }

    app.listen(PORT, () => {
        console.log(`[mongoose] Server running on http://localhost:${PORT}`);
        console.log(`[mongoose] Swagger UI at http://localhost:${PORT}/api-docs`);
        if (!dbConnected) console.warn('[mongoose] Set MONGODB_URI in .env to enable database routes');
    });
}

bootstrap().catch(console.error);
