import { Model } from "objection";
import { registerSchema } from "swaggiffy";

export class User extends Model {
    static tableName = "users";

    static jsonSchema = {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
            id: { type: "integer" },
            name: { type: "string", minLength: 1, maxLength: 255 },
            email: { type: "string", maxLength: 255 },
            password: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    };

    id = 0;
    name = "";
    email = "";
    password = "";
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
}

registerSchema("User", User, { orm: "objection" });
