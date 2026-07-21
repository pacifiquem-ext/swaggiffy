import { registerSchema } from "swaggiffy";

/** DMMF-shaped descriptor matching `prisma/schema.prisma` model User. */
export const UserDmmf = {
    name: "User",
    fields: [
        {
            name: "id",
            kind: "scalar",
            type: "Int",
            isRequired: true,
            isId: true,
            hasDefaultValue: true,
            default: { name: "autoincrement", args: [] },
        },
        { name: "name", kind: "scalar", type: "String", isRequired: true },
        { name: "email", kind: "scalar", type: "String", isRequired: true, isUnique: true },
        { name: "password", kind: "scalar", type: "String", isRequired: true },
        {
            name: "createdAt",
            kind: "scalar",
            type: "DateTime",
            isRequired: true,
            hasDefaultValue: true,
            default: { name: "now", args: [] },
        },
        { name: "articles", kind: "object", type: "Article", isRequired: false, isList: true, relationName: "UserArticles" },
    ],
};

registerSchema("User", UserDmmf, { orm: "prisma" });
