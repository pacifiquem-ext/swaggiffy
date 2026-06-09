import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { registerDefinition } from "swaggiffy";
import { db, dbInsert } from "../db";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await db("users").where({ email }).first();
        if (exists) return res.status(409).json({ error: "Email already registered" });

        const user = await dbInsert("users", { name, email, password: await bcrypt.hash(password, 10) }, "id, name, email");
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || "secret",
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
        );
        return res.status(201).json({ token, user });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db("users").where({ email }).first();
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || "secret",
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" },
        );
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: "/api/auth",
    mappedSchema: "User",
    tags: "Auth",
    summary: "Authentication endpoints",
});

export { router as authRouter };
