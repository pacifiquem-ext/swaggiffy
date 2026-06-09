import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: number;
    userEmail?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization header missing or malformed" });
    }

    const token = authHeader.substring(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;
        req.userId = payload.id;
        req.userEmail = payload.email;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
