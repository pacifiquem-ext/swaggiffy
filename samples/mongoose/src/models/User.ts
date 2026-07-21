import mongoose, { Document, Model } from "mongoose";
import { registerSchema } from "swaggiffy";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    name: { type: String, required: true, minlength: 1, maxlength: 255 },
    email: { type: String, required: true, unique: true, maxlength: 255 },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

registerSchema("User", userSchema, { orm: "mongoose" });

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
