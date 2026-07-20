import { expect } from "chai";
import mongoose from "mongoose";
import { DataTypes } from "sequelize";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";

// drizzle-orm's published .d.ts uses TS syntax newer than this project's TypeScript 4.5,
// so we load the runtime builders without pulling those declarations into `tsc`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pgTable, serial, varchar, text, integer, boolean: drizzleBoolean, timestamp } = require("drizzle-orm/pg-core");
import { SchemaExtractor } from "../../lib/extractors/schema.extractor";
import { registerSchema } from "../../lib/helpers/registerSchema";
import { getSchemaMetadataStorage } from "../../lib/globals";
import { Utility } from "../../lib/utils/Utility";
import { PlatformTools } from "../../lib/platform/PlatformTools";
import { SwaggiffyError } from "../../lib/errors/SwaggiffyError";
import { TClassProp } from "../../lib/typings";

function byProp(props: TClassProp[]): Record<string, TClassProp> {
    return Object.fromEntries(props.map((p) => [p.prop, p]));
}

function clearSchemaStorage() {
    (getSchemaMetadataStorage().schemas as unknown[]).splice(0);
}

function captureWarns(fn: () => void): string[] {
    const warns: string[] = [];
    const orig = PlatformTools.logWarn;
    PlatformTools.logWarn = (m: string) => {
        warns.push(m);
    };
    try {
        fn();
    } finally {
        PlatformTools.logWarn = orig;
    }
    return warns;
}

describe("ORM extractor: Drizzle", () => {
    const users = pgTable("users", {
        id: serial("id").primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
    });

    const events = pgTable("events", {
        id: serial("id").primaryKey(),
        title: varchar("title", { length: 255 }).notNull(),
        description: text("description"),
        location: varchar("location", { length: 255 }),
        date: timestamp("date").notNull(),
        capacity: integer("capacity").default(100),
        published: drizzleBoolean("published").default(false),
        userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow(),
    });

    it("extracts types, required, maxLength, default, and FK references", () => {
        const result = SchemaExtractor.extractDrizzle(events, "Event");
        expect(result.name).to.equal("Event");
        const p = byProp(result.props);

        expect(p.title.type).to.equal("string");
        expect(p.title.maxLength).to.equal(255);
        expect(p.title.required).to.equal(true);

        expect(p.capacity.type).to.equal("integer");
        expect(p.capacity.default).to.equal(100);

        expect(p.published.type).to.equal("boolean");
        expect(p.published.default).to.equal(false);

        expect(p.userId.type).to.equal("integer");
        expect(p.userId.references).to.equal("users.id");

        expect(p.description.type).to.equal("string");
        expect(p.description.required).to.not.equal(true);
        expect(p.description.nullable).to.equal(true);

        expect(p.date.required).to.equal(true);
        expect(p.date.format).to.equal("date-time");
    });

    it("registerSchema emits those constraints on the swagger definition", () => {
        clearSchemaStorage();
        registerSchema("Event", events, { orm: "drizzle" });
        const def = getSchemaMetadataStorage().schemas[0].swaggerDefinition["Event"];
        expect(def.required).to.include.members(["title", "date", "id"]);
        expect(def.properties.title.type).to.equal("string");
        expect(def.properties.title.maxLength).to.equal(255);
        expect(def.properties.capacity.default).to.equal(100);
        expect(def.properties.published.type).to.equal("boolean");
        expect(def.properties.published.default).to.equal(false);
        expect(def.properties.userId["x-references"]).to.equal("users.id");
        expect(def.properties.description.nullable).to.equal(true);
        expect(def.required).to.not.include("description");
        expect(def.required).to.not.include("capacity");
    });
});

describe("ORM extractor: TypeORM", () => {
    /* Explicit annotations are required so emitDecoratorMetadata records design:type. */
    /* eslint-disable @typescript-eslint/no-inferrable-types */
    @Entity("users")
    class UserEntity {
        @PrimaryGeneratedColumn()
        id: number = 0;

        @Column()
        name: string = "";
    }

    @Entity("tasks")
    class TaskEntity {
        @PrimaryGeneratedColumn()
        id: number = 0;

        @Column()
        title: string = "";

        @Column({ nullable: true, length: 500 })
        description: string = "";

        @Column({ default: false })
        completed: boolean = false;

        @Column({ type: "int" })
        userId: number = 0;

        @CreateDateColumn()
        createdAt: Date = new Date();

        @ManyToOne(() => UserEntity)
        user?: UserEntity;
    }
    /* eslint-enable @typescript-eslint/no-inferrable-types */

    it("extracts @Column / @PrimaryGeneratedColumn / @CreateDateColumn metadata", () => {
        const result = SchemaExtractor.extractTypeORM(TaskEntity, "Task");
        const p = byProp(result.props);

        expect(p.id.type).to.equal("integer");
        expect(p.id.required).to.equal(true);

        expect(p.title.type).to.equal("string");
        expect(p.title.required).to.equal(true);

        expect(p.description.required).to.not.equal(true);
        expect(p.description.nullable).to.equal(true);
        expect(p.description.maxLength).to.equal(500);

        expect(p.completed.type).to.equal("boolean");
        expect(p.completed.default).to.equal(false);

        expect(p.userId.type).to.equal("integer");

        expect(p.createdAt.type).to.equal("string");
        expect(p.createdAt.format).to.equal("date-time");

        expect(p.user.references).to.equal("UserEntity");
    });
});

describe("ORM extractor: Prisma", () => {
    const userDmmf = {
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
            {
                name: "createdAt",
                kind: "scalar",
                type: "DateTime",
                isRequired: true,
                hasDefaultValue: true,
                default: { name: "now", args: [] },
            },
            {
                name: "articles",
                kind: "object",
                type: "Article",
                isRequired: false,
                isList: true,
                relationName: "ArticleToUser",
            },
        ],
    };

    it("maps DMMF scalars, required, defaults, and relations", () => {
        const result = SchemaExtractor.extractPrisma(userDmmf, "User");
        const p = byProp(result.props);

        expect(p.id.type).to.equal("integer");
        expect(p.id.required).to.equal(true);
        expect(p.id.default).to.equal("autoincrement()");

        expect(p.name.type).to.equal("string");
        expect(p.name.required).to.equal(true);

        expect(p.createdAt.type).to.equal("string");
        expect(p.createdAt.format).to.equal("date-time");
        expect(p.createdAt.default).to.equal("now()");

        expect(p.articles.type).to.equal("array");
        expect(p.articles.references).to.equal("Article");
    });

    it("resolves a named model from Prisma.dmmf-shaped input", () => {
        const prismaNs = { dmmf: { datamodel: { models: [userDmmf, { name: "Article", fields: [] }] } } };
        const result = SchemaExtractor.extractPrisma(prismaNs, "User");
        expect(result.props.map((p) => p.prop)).to.include("email");
    });
});

describe("ORM extractor: Knex", () => {
    const descriptor = {
        id: { type: "integer", primaryKey: true },
        name: { type: "string", notNull: true, maxLength: 255 },
        email: { type: "string", notNull: true },
        quantity: { type: "integer", default: 0 },
        userId: { type: "integer", references: { table: "users", column: "id" } },
        createdAt: { type: "datetime" },
    };

    it("extracts types, required, maxLength, default, and references from a descriptor", () => {
        const result = SchemaExtractor.extractKnex(descriptor, "Item");
        const p = byProp(result.props);

        expect(p.id.type).to.equal("integer");
        expect(p.id.required).to.equal(true);

        expect(p.name.type).to.equal("string");
        expect(p.name.required).to.equal(true);
        expect(p.name.maxLength).to.equal(255);

        expect(p.quantity.default).to.equal(0);
        expect(p.userId.references).to.equal("users.id");
        expect(p.createdAt.format).to.equal("date-time");
    });

    it("rejects plain primitive objects that lose type metadata", () => {
        expect(() => SchemaExtractor.extractKnex({ id: 0, name: "" }, "User")).to.throw(SwaggiffyError);
    });
});

describe("ORM extractor: Objection", () => {
    it("mirrors static jsonSchema (with required and constraints)", () => {
        class Book {
            static tableName = "books";
            static jsonSchema = {
                type: "object",
                required: ["title", "author"],
                properties: {
                    id: { type: "integer" },
                    title: { type: "string", minLength: 1, maxLength: 255 },
                    author: { type: "string" },
                    available: { type: "boolean", default: true },
                    userId: { type: "integer" },
                },
            };
            static relationMappings = {
                owner: {
                    relation: "BelongsToOneRelation",
                    modelClass: "User",
                    join: { from: "books.userId", to: "users.id" },
                },
            };
        }

        const result = SchemaExtractor.extractObjection(Book, "Book");
        const p = byProp(result.props);
        expect(p.title.type).to.equal("string");
        expect(p.title.required).to.equal(true);
        expect(p.title.maxLength).to.equal(255);
        expect(p.title.minLength).to.equal(1);
        expect(p.author.required).to.equal(true);
        expect(p.available.default).to.equal(true);
        expect(p.owner.references).to.exist;
    });

    it("falls back to class inspection with a warning when jsonSchema is absent", () => {
        class PlainModel {
            id = 0;
            title = "";
        }

        const warns = captureWarns(() => {
            const result = SchemaExtractor.extractObjection(PlainModel, "PlainModel");
            expect(result.props.map((p) => p.prop)).to.include.members(["id", "title"]);
        });
        expect(warns.some((w) => w.includes("jsonSchema"))).to.equal(true);
    });
});

describe("ORM extractor: Sequelize (upgrade)", () => {
    const attrs = {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        stock: { type: DataTypes.INTEGER, defaultValue: 0 },
        userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    };

    it("maps allowNull, defaultValue, STRING(255) length, and references", () => {
        const result = SchemaExtractor.extractSequelize(attrs, "Product");
        const p = byProp(result.props);

        expect(p.name.type).to.equal("string");
        expect(p.name.required).to.equal(true);
        expect(p.name.maxLength).to.equal(255);

        expect(p.stock.type).to.equal("integer");
        expect(p.stock.default).to.equal(0);
        expect(p.stock.required).to.not.equal(true);

        expect(p.id.type).to.equal("integer");
        expect(p.id.required).to.equal(true);

        expect(p.price.required).to.equal(true);
        expect(p.description.nullable).to.equal(true);

        expect(p.userId.references).to.equal("users.id");
    });
});

describe("ORM extractor: Mongoose (upgrade)", () => {
    const schema = new mongoose.Schema({
        title: { type: String, required: true, minlength: 1, maxlength: 200 },
        status: { type: String, enum: ["draft", "published", "archived"], required: true },
        views: { type: Number, min: 0, max: 1_000_000, default: 0 },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        published: { type: Boolean, default: false },
    });

    it("maps required, enum, minlength/maxlength, min/max, default, and refs", () => {
        const result = SchemaExtractor.extractMongoose(schema, "Post");
        const p = byProp(result.props);

        expect(p.title.required).to.equal(true);
        expect(p.title.minLength).to.equal(1);
        expect(p.title.maxLength).to.equal(200);

        expect(p.status.enum).to.deep.equal(["draft", "published", "archived"]);
        expect(p.status.required).to.equal(true);

        expect(p.views.minimum).to.equal(0);
        expect(p.views.maximum).to.equal(1_000_000);
        expect(p.views.default).to.equal(0);

        expect(p.author.required).to.equal(true);
        expect(p.author.references).to.equal("User");

        expect(p.published.type).to.equal("boolean");
        expect(p.published.default).to.equal(false);
    });
});

describe("registerSchema ORM routing", () => {
    beforeEach(clearSchemaStorage);

    it("throws a clear error for an unknown orm, not a silent fallback", () => {
        expect(() => registerSchema("X", { id: 0 }, { orm: "someUnknown" as never })).to.throw(SwaggiffyError, /not supported/);
    });

    it("logs a warning and still registers a plain object when orm is omitted", () => {
        const warns = captureWarns(() => {
            registerSchema("User", { id: 0, name: "" });
        });
        expect(warns.some((w) => w.includes("without an { orm } option"))).to.equal(true);
        const def = getSchemaMetadataStorage().schemas[0].swaggerDefinition["User"];
        expect(def.properties.id.type).to.equal("number");
        expect(def.properties.name.type).to.equal("string");
    });

    it("routes { orm: 'knex' } through the knex extractor", () => {
        registerSchema(
            "User",
            {
                id: { type: "integer", primaryKey: true },
                name: { type: "string", notNull: true, maxLength: 255 },
            },
            { orm: "knex" },
        );
        const def = getSchemaMetadataStorage().schemas[0].swaggerDefinition["User"];
        expect(def.required).to.include.members(["id", "name"]);
        expect(def.properties.name.maxLength).to.equal(255);
    });
});

describe("Utility.genSchemaDef rich fields", () => {
    it("emits a schema-level required array plus default, maxLength, and x-references", () => {
        const result = Utility.genSchemaDef({
            name: "Event",
            props: [
                { prop: "title", type: "string", required: true, maxLength: 255 },
                { prop: "capacity", type: "integer", default: 100 },
                { prop: "userId", type: "integer", references: "users.id" },
            ],
        });
        expect(result.Event.required).to.deep.equal(["title"]);
        expect(result.Event.properties.title.maxLength).to.equal(255);
        expect(result.Event.properties.capacity.default).to.equal(100);
        expect(result.Event.properties.userId["x-references"]).to.equal("users.id");
    });
});
