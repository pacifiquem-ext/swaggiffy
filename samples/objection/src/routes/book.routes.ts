import { Router } from 'express';
import { registerDefinition } from 'swaggiffy';
import { Book } from '../models/Book';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const books = await Book.query().select('*');
        return res.json(books);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await Book.query().findById(req.params.id);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        return res.json(book);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, author, isbn, year } = req.body;
        const book = await Book.query().insertAndFetch({ title, author, isbn, year, userId: req.userId, available: true });
        return res.status(201).json(book);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const book = await Book.query().patchAndFetchById(req.params.id, req.body);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        return res.json(book);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const deleted = await Book.query().deleteById(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Book not found' });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: '/api/books',
    mappedSchema: 'Book',
    tags: 'Books',
    summary: 'Library book management',
});

export { router as bookRouter };
