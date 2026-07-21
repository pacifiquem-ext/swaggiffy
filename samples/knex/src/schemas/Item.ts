import { registerSchema } from "swaggiffy";

registerSchema(
    "Item",
    {
        id: { type: "integer", primaryKey: true },
        name: { type: "string", notNull: true, maxLength: 255 },
        description: { type: "text" },
        quantity: { type: "integer", default: 0 },
        price: { type: "decimal", notNull: true },
        userId: { type: "integer", notNull: true, references: { table: "users", column: "id" } },
        createdAt: { type: "datetime", default: "now()" },
    },
    { orm: "knex" },
);
