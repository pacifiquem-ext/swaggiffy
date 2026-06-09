import { Router } from 'express';
import { registerDefinition } from 'swaggiffy';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const users = await AppDataSource.getRepository(User).find({ select: ['id', 'name', 'email', 'createdAt'] });
        return res.json(users);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: Number(req.params.id) },
            select: ['id', 'name', 'email', 'createdAt'],
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req, res) => {
    try {
        const repo = AppDataSource.getRepository(User);
        const user = await repo.findOneBy({ id: Number(req.params.id) });
        if (!user) return res.status(404).json({ error: 'User not found' });
        repo.merge(user, { name: req.body.name });
        await repo.save(user);
        return res.json({ id: user.id, name: user.name, email: user.email });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await AppDataSource.getRepository(User).delete(req.params.id);
        if (!result.affected) return res.status(404).json({ error: 'User not found' });
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
