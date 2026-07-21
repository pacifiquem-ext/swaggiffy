import { registerSchema } from "swaggiffy";

registerSchema(
    "User",
    {
        id: { type: "integer", primaryKey: true },
        name: { type: "string", notNull: true, maxLength: 255 },
        email: { type: "string", notNull: true, maxLength: 255 },
        password: { type: "string", notNull: true },
        createdAt: { type: "datetime", default: "now()" },
    },
    { orm: "knex" },
);
