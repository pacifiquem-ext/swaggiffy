import 'reflect-metadata';
import express from 'express';
import dotenv from 'dotenv';
import { Swaggiffy } from 'swaggiffy';

dotenv.config();

import './schemas/User';
import './schemas/Article';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { articleRouter } from './routes/article.routes';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/articles', articleRouter);

new Swaggiffy().setupExpress(app).swaggiffy();

app.listen(PORT, () => {
    console.log(`[prisma] Server running on http://localhost:${PORT}`);
    console.log(`[prisma] Swagger UI at http://localhost:${PORT}/api-docs`);
    console.log(`[prisma] First-time setup: npm run db:generate && npm run db:push`);
});
