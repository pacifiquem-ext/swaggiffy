import { Router } from "express";
import mongoose from "mongoose";
import { registerDefinition } from "swaggiffy";
import { Post } from "../models/Post";
import { authenticate, AuthRequest } from "../middleware/auth";

const dbReady = () => mongoose.connection.readyState === 1;

const router = Router();

router.get("/", async (req, res) => {
    if (!dbReady()) return res.status(503).json({ error: "Database unavailable" });
    try {
        const posts = await Post.find({ published: true }).populate("author", "name email");
        return res.json(posts);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate("author", "name email");
        if (!post) return res.status(404).json({ error: "Post not found" });
        return res.json(post);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post("/", authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, content, tags, published } = req.body;
        const post = await Post.create({ title, content, tags, published, author: req.userId });
        return res.status(201).json(post);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        const { title, content, tags, published } = req.body;
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { title, content, tags, published, updatedAt: new Date() },
            { new: true },
        );
        if (!post) return res.status(404).json({ error: "Post not found" });
        return res.json(post);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: "/api/posts",
    mappedSchema: "Post",
    tags: "Posts",
    summary: "Blog post management",
    description: "CRUD operations for blog posts",
});

export { router as postRouter };
