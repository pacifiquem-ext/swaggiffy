import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { registerDefinition } from 'swaggiffy';
import { db } from '../db';
import { users } from '../schema';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt }).from(users);
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const [user] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, Number(req.params.id)));
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req, res) => {
    try {
        const [user] = await db
            .update(users)
            .set({ name: req.body.name })
            .where(eq(users.id, Number(req.params.id)))
            .returning({ id: users.id, name: users.name, email: users.email });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await db.delete(users).where(eq(users.id, Number(req.params.id))).returning({ id: users.id });
        if (!result.length) return res.status(404).json({ error: 'User not found' });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: '/api/users',
    mappedSchema: 'User',
    tags: 'Users',
    summary: 'User management',
});

export { router as userRouter };
