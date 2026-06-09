import { Router } from 'express';
import { registerDefinition } from 'swaggiffy';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        return res.json(users);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req, res) => {
    try {
        const [updated] = await User.update(req.body, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ error: 'User not found' });
        const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const deleted = await User.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'User not found' });
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
