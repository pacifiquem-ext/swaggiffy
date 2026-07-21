import { registerSchema } from "swaggiffy";

/** DMMF-shaped descriptor matching `prisma/schema.prisma` model Article. */
export const ArticleDmmf = {
    name: "Article",
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
        { name: "title", kind: "scalar", type: "String", isRequired: true },
        { name: "content", kind: "scalar", type: "String", isRequired: true },
        {
            name: "published",
            kind: "scalar",
            type: "Boolean",
            isRequired: true,
            hasDefaultValue: true,
            default: false,
        },
        { name: "authorId", kind: "scalar", type: "Int", isRequired: true },
        {
            name: "author",
            kind: "object",
            type: "User",
            isRequired: true,
            relationName: "UserArticles",
            relationFromFields: ["authorId"],
            relationToFields: ["id"],
        },
        {
            name: "createdAt",
            kind: "scalar",
            type: "DateTime",
            isRequired: true,
            hasDefaultValue: true,
            default: { name: "now", args: [] },
        },
        { name: "updatedAt", kind: "scalar", type: "DateTime", isRequired: true, isUpdatedAt: true },
    ],
};

registerSchema("Article", ArticleDmmf, { orm: "prisma" });
