import { Router } from 'express';
import { registerDefinition } from 'swaggiffy';
import { db, dbInsert, dbUpdateOne } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const items = await db('items').select('*');
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const item = await db('items').where({ id: req.params.id }).first();
        if (!item) return res.status(404).json({ error: 'Item not found' });
        return res.json(item);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, quantity, price } = req.body;
        const item = await dbInsert('items', { name, description, quantity, price, user_id: req.userId });
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, quantity, price } = req.body;
        const item = await dbUpdateOne('items', { id: req.params.id }, { name, description, quantity, price });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        return res.json(item);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const deleted = await db('items').where({ id: req.params.id }).delete();
        if (!deleted) return res.status(404).json({ error: 'Item not found' });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: '/api/items',
    mappedSchema: 'Item',
    tags: 'Items',
    summary: 'Inventory item management',
});

export { router as itemRouter };
