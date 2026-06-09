import { Router } from "express";
import { registerDefinition } from "swaggiffy";
import { prisma } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const articles = await prisma.article.findMany({
            where: { published: true },
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
        });
        return res.json(articles);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const article = await prisma.article.findUnique({
            where: { id: Number(req.params.id) },
            include: { author: { select: { id: true, name: true } } },
        });
        if (!article) return res.status(404).json({ error: "Article not found" });
        return res.json(article);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, content, published } = req.body;
        const article = await prisma.article.create({
            data: { title, content, published: published ?? false, authorId: req.userId! },
        });
        return res.status(201).json(article);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        const article = await prisma.article.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        return res.json(article);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        await prisma.article.delete({ where: { id: Number(req.params.id) } });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: "/api/articles",
    mappedSchema: "Article",
    tags: "Articles",
    summary: "Article management",
});

export { router as articleRouter };
