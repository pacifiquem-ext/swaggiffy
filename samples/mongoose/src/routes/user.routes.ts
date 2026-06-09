import { Router } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { registerDefinition } from "swaggiffy";
import { User } from "../models/User";
import { authenticate } from "../middleware/auth";

const dbReady = () => mongoose.connection.readyState === 1;

const router = Router();

router.get("/", authenticate, async (req, res) => {
    if (!dbReady()) return res.status(503).json({ error: "Database unavailable" });
    try {
        const users = await User.find({}, "-password");
        return res.json(users);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/:id", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id, "-password");
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.put("/:id", authenticate, async (req, res) => {
    try {
        const { name, password } = req.body;
        const update: any = { name };
        if (password) update.password = await bcrypt.hash(password, 10);
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: "-password" });
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticate, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
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
    description: "CRUD operations for users",
});

export { router as userRouter };
