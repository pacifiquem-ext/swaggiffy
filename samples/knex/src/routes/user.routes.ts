import { Router } from "express";
import { registerDefinition } from "swaggiffy";
import { db, dbUpdateOne } from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req, res) => {
    try {
        const users = await db("users").select("id", "name", "email", "created_at");
        return res.json(users);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/:id", authenticate, async (req, res) => {
    try {
        const user = await db("users").where({ id: req.params.id }).select("id", "name", "email").first();
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put("/:id", authenticate, async (req, res) => {
    try {
        const user = await dbUpdateOne("users", { id: req.params.id }, { name: req.body.name }, "id, name, email");
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticate, async (req, res) => {
    try {
        const deleted = await db("users").where({ id: req.params.id }).delete();
        if (!deleted) return res.status(404).json({ error: "User not found" });
        return res.json({ deleted: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: "/api/users",
    mappedSchema: "User",
    tags: "Users",
    summary: "User management",
});

export { router as userRouter };
