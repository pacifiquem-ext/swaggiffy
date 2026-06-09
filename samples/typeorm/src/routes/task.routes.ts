import { Router } from "express";
import { registerDefinition } from "swaggiffy";
import { AppDataSource } from "../data-source";
import { Task } from "../entity/Task";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
    try {
        const tasks = await AppDataSource.getRepository(Task).findBy({ userId: req.userId });
        return res.json(tasks);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        const task = await AppDataSource.getRepository(Task).findOneBy({ id: Number(req.params.id), userId: req.userId });
        if (!task) return res.status(404).json({ error: "Task not found" });
        return res.json(task);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, description } = req.body;
        const repo = AppDataSource.getRepository(Task);
        const task = repo.create({ title, description, userId: req.userId });
        await repo.save(task);
        return res.status(201).json(task);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(Task);
        const task = await repo.findOneBy({ id: Number(req.params.id), userId: req.userId });
        if (!task) return res.status(404).json({ error: "Task not found" });
        repo.merge(task, req.body);
        await repo.save(task);
        return res.json(task);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        const result = await AppDataSource.getRepository(Task).delete({ id: Number(req.params.id), userId: req.userId });
        if (!result.affected) return res.status(404).json({ error: "Task not found" });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: "/api/tasks",
    mappedSchema: "Task",
    tags: "Tasks",
    summary: "Task management",
});

export { router as taskRouter };
