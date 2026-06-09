import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { registerDefinition } from 'swaggiffy';
import { db } from '../db';
import { events } from '../schema';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await db.select().from(events).where(eq(events.published, true));
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [event] = await db.select().from(events).where(eq(events.id, Number(req.params.id)));
        if (!event) return res.status(404).json({ error: 'Event not found' });
        return res.json(event);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, description, location, date, capacity, published } = req.body;
        const [event] = await db
            .insert(events)
            .values({ title, description, location, date: new Date(date), capacity, published, userId: req.userId })
            .returning();
        return res.status(201).json(event);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, description, location, date, capacity, published } = req.body;
        const [event] = await db
            .update(events)
            .set({ title, description, location, date: date ? new Date(date) : undefined, capacity, published })
            .where(eq(events.id, Number(req.params.id)))
            .returning();
        if (!event) return res.status(404).json({ error: 'Event not found' });
        return res.json(event);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await db.delete(events).where(eq(events.id, Number(req.params.id))).returning({ id: events.id });
        if (!result.length) return res.status(404).json({ error: 'Event not found' });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: '/api/events',
    mappedSchema: 'Event',
    tags: 'Events',
    summary: 'Event management',
});

export { router as eventRouter };
