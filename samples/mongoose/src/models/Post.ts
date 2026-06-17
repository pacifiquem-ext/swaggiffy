import mongoose, { Document, Model } from "mongoose";
import { registerSchema } from "swaggiffy";

export interface IPost extends Document {
    title: string;
    content: string;
    author: mongoose.Types.ObjectId;
    tags: string[];
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new mongoose.Schema<IPost>({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String }],
    published: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

registerSchema("Post", postSchema, { orm: "mongoose" });

export const Post: Model<IPost> = mongoose.model<IPost>("Post", postSchema);
