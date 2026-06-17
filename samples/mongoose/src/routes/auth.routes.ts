import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import mongoose from "mongoose";
import { registerDefinition } from "swaggiffy";
import { User } from "../models/User";

const dbReady = () => mongoose.connection.readyState === 1;

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"];

router.post("/register", async (req, res) => {
    if (!dbReady()) return res.status(503).json({ error: "Database unavailable — set MONGODB_URI and restart" });
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: "Email already registered" });

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashed });
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN },
        );
        return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post("/login", async (req, res) => {
    if (!dbReady()) return res.status(503).json({ error: "Database unavailable — set MONGODB_URI and restart" });
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN },
        );
        return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

registerDefinition(router, {
    basePath: "/api/auth",
    mappedSchema: "User",
    tags: "Auth",
    summary: "Authentication endpoints",
    description: "Register and login operations",
});

export { router as authRouter };
