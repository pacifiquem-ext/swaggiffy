import { Model } from "objection";
import { registerSchema } from "swaggiffy";
import { User } from "./User";

export class Book extends Model {
    static tableName = "books";

    static jsonSchema = {
        type: "object",
        required: ["title", "author"],
        properties: {
            id: { type: "integer" },
            title: { type: "string", minLength: 1, maxLength: 255 },
            author: { type: "string", maxLength: 255 },
            isbn: { type: "string", maxLength: 32 },
            year: { type: "integer" },
            available: { type: "boolean", default: true },
            userId: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
        },
    };

    static relationMappings = {
        owner: {
            relation: Model.BelongsToOneRelation,
            modelClass: User,
            join: { from: "books.userId", to: "users.id" },
        },
    };

    id = 0;
    title = "";
    author = "";
    isbn = "";
    year = 0;
    available = true;
    userId = 0;
    createdAt: Date = new Date();
}

registerSchema("Book", Book, { orm: "objection" });
