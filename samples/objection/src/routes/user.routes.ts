import { Router } from "express";
import { registerDefinition } from "swaggiffy";
import { User } from "../models/User";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (req, res) => {
    try {
        const users = await User.query().select("id", "name", "email", "createdAt");
        return res.json(users);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/:id", authenticate, async (req, res) => {
    try {
        const user = await User.query().findById(req.params.id).select("id", "name", "email");
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put("/:id", authenticate, async (req, res) => {
    try {
        const user = await User.query().patchAndFetchById(req.params.id, { name: req.body.name });
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json({ id: user.id, name: user.name, email: user.email });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticate, async (req, res) => {
    try {
        const deleted = await User.query().deleteById(req.params.id);
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
