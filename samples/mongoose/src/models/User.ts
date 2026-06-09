import mongoose from 'mongoose';
import { registerSchema } from 'swaggiffy';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

registerSchema('User', userSchema, { orm: 'mongoose' });

export const User = mongoose.model('User', userSchema);
