import mongoose from 'mongoose';
import { registerSchema } from 'swaggiffy';

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    published: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

registerSchema('Post', postSchema, { orm: 'mongoose' });

export const Post = mongoose.model('Post', postSchema);
