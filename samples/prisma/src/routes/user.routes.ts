import { Router } from 'express';
import { registerDefinition } from 'swaggiffy';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true } });
        return res.json(users);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(req.params.id) },
            select: { id: true, name: true, email: true, createdAt: true },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: Number(req.params.id) },
            data: { name: req.body.name },
            select: { id: true, name: true, email: true },
        });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: Number(req.params.id) } });
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
