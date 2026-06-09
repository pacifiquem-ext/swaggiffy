import { Router } from 'express';
import { registerDefinition } from 'swaggiffy';
import { Product } from '../models/Product';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const products = await Product.findAll();
        return res.json(products);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        return res.json(product);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { name, description, price, stock } = req.body;
        const product = await Product.create({ name, description, price, stock, userId: req.userId });
        return res.status(201).json(product);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const [updated] = await Product.update(req.body, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ error: 'Product not found' });
        return res.json(await Product.findByPk(req.params.id));
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const deleted = await Product.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Product not found' });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: '/api/products',
    mappedSchema: 'Product',
    tags: 'Products',
    summary: 'Product catalog management',
});

export { router as productRouter };
