/**
 * Regenerates committed sample swagger files from the current extractors + route metadata.
 * Run: yarn compile && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/regen-sample-specs.ts
 */
import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";
import { DataTypes } from "sequelize";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { getAPIDefinitionMetadataStorage, getConfigMetadataStorage, getSchemaMetadataStorage } from "../lib/globals";
import { registerSchema } from "../lib/helpers/registerSchema";
import { registerDefinition } from "../lib/helpers/registerDefinition";
import { Runner } from "../lib/runners/Runner";
import { Templates } from "../lib/utils/Templates";
import { TFormat, TOpenApiVersion } from "../lib/typings";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pgTable, serial, varchar, text, integer, boolean: drizzleBoolean, timestamp } = require("drizzle-orm/pg-core");

const ROOT = path.resolve(__dirname, "..");

function clearStorages() {
    (getSchemaMetadataStorage().schemas as unknown[]).splice(0);
    (getAPIDefinitionMetadataStorage().apiDefinitions as unknown[]).splice(0);
}

function makeRouter(routes: Array<{ method: string; path: string; keys?: string[] }>) {
    return {
        stack: routes.map((r) => ({
            route: { path: r.path, stack: [{ method: r.method }] },
            keys: (r.keys || []).map((name) => ({ name })),
        })),
    };
}

function setupAndWrite(opts: {
    sampleDir: string;
    outFile: string;
    projectName: string;
    openApiVersion: TOpenApiVersion;
    format: TFormat;
}) {
    const absOut = path.join(ROOT, "samples", opts.sampleDir, opts.outFile.replace(/^\.\//, ""));
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    const template = opts.openApiVersion.includes("3.")
        ? Templates.getOSA3Template(opts.projectName)
        : Templates.getOSA2Template(opts.projectName);
    fs.writeFileSync(absOut, template);

    const storage = getConfigMetadataStorage();
    storage.appName = opts.projectName;
    storage.openApiVersion = opts.openApiVersion;
    storage.format = opts.format;
    storage.swaggerDefinitionFilePath = absOut;
    storage.relativePath = false;

    Runner.execute();
}

function regenDrizzle() {
    clearStorages();
    const users = pgTable("users", {
        id: serial("id").primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        email: varchar("email", { length: 255 }).notNull().unique(),
        password: varchar("password", { length: 255 }).notNull(),
        createdAt: timestamp("created_at").defaultNow(),
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
    registerSchema("User", users, { orm: "drizzle" });
    registerSchema("Event", events, { orm: "drizzle" });

    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/events",
        mappedSchema: "Event",
        tags: "Events",
        summary: "Event management",
        description: "Public listing supports query filters; writes require auth.",
        parameters: [
            { in: "query", name: "published", required: false, type: "boolean", description: "Filter by published flag" },
            { in: "query", name: "q", required: false, type: "string", description: "Search in event title" },
        ],
    });

    setupAndWrite({ sampleDir: "drizzle", outFile: "./swagger/swagger.json", projectName: "Drizzle Events API", openApiVersion: "3.0", format: "json" });
}

function regenKnex() {
    clearStorages();
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

    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/items",
        mappedSchema: "Item",
        tags: "Items",
        summary: "Inventory item management",
        description: "List accepts an optional q query parameter to search by name.",
        parameters: [{ in: "query", name: "q", required: false, type: "string", description: "Search items by name" }],
    });

    setupAndWrite({ sampleDir: "knex", outFile: "./swagger/swagger.json", projectName: "Knex Inventory API", openApiVersion: "2.0", format: "json" });
}

function regenMongoose() {
    clearStorages();
    const userSchema = new mongoose.Schema({
        name: { type: String, required: true, minlength: 1, maxlength: 255 },
        email: { type: String, required: true, unique: true, maxlength: 255 },
        password: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    });
    const postSchema = new mongoose.Schema({
        title: { type: String, required: true, minlength: 1, maxlength: 200 },
        content: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        tags: [{ type: String }],
        published: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    });
    registerSchema("User", userSchema, { orm: "mongoose" });
    registerSchema("Post", postSchema, { orm: "mongoose" });

    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints",
        description: "Register and login operations",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/posts",
        mappedSchema: "Post",
        tags: "Posts",
        summary: "Blog post management",
        description: "CRUD operations for blog posts",
    });

    setupAndWrite({ sampleDir: "mongoose", outFile: "./swagger/swagger.yaml", projectName: "Mongoose Blog API", openApiVersion: "3.0", format: "yaml" });
}

function regenSequelize() {
    clearStorages();
    registerSchema(
        "User",
        {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
            password: { type: DataTypes.STRING(255), allowNull: false },
        },
        { orm: "sequelize" },
    );
    registerSchema(
        "Product",
        {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            description: { type: DataTypes.TEXT },
            price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
            stock: { type: DataTypes.INTEGER, defaultValue: 0 },
            userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
        },
        { orm: "sequelize" },
    );

    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints (public)",
        description: "Register and login do not require a bearer token.",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management (authenticated)",
        description: "Requires a Bearer JWT obtained from /api/auth/login.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Success" }, "401": { description: "Unauthorized" }, "500": { description: "Internal Server Error" } },
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/products",
        mappedSchema: "Product",
        tags: "Products",
        summary: "Product catalog management (authenticated writes)",
        description: "List is public in the sample app; mutations require Bearer auth at the route middleware.",
        security: [{ bearerAuth: [] }],
    });

    setupAndWrite({ sampleDir: "sequelize", outFile: "./swagger/swagger.json", projectName: "Sequelize Shop API", openApiVersion: "3.0", format: "json" });
}

function regenTypeorm() {
    clearStorages();

    @Entity("users")
    class User {
        @PrimaryGeneratedColumn()
        id: number = 0;
        @Column()
        name: string = "";
        @Column({ unique: true })
        email: string = "";
        @Column()
        password: string = "";
        @CreateDateColumn()
        createdAt: Date = new Date();
    }

    @Entity("tasks")
    class Task {
        @PrimaryGeneratedColumn()
        id: number = 0;
        @Column()
        title: string = "";
        @Column({ nullable: true })
        description: string = "";
        @Column({ default: false })
        completed: boolean = false;
        @Column({ type: "int" })
        userId: number = 0;
        @CreateDateColumn()
        createdAt: Date = new Date();
        @ManyToOne(() => User)
        user?: User;
    }

    registerSchema("User", User, { orm: "typeorm" });
    registerSchema("Task", Task, { orm: "typeorm" });

    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/tasks",
        mappedSchema: "Task",
        tags: "Tasks",
        summary: "Task management",
        description: "CRUD for tasks. Requires X-Request-ID on every call for tracing.",
        parameters: [
            { in: "header", name: "X-Request-ID", required: false, type: "string", description: "Client request correlation id" },
            { in: "header", name: "X-Auth-Token", required: true, type: "string", description: "Session token header" },
        ],
        security: [{ bearerAuth: [] }],
    });

    setupAndWrite({ sampleDir: "typeorm", outFile: "./swagger/swagger.json", projectName: "TypeORM Task Manager API", openApiVersion: "3.0", format: "json" });
}

function regenPrisma() {
    clearStorages();
    registerSchema(
        "User",
        {
            name: "User",
            fields: [
                { name: "id", kind: "scalar", type: "Int", isRequired: true, isId: true, hasDefaultValue: true, default: { name: "autoincrement", args: [] } },
                { name: "name", kind: "scalar", type: "String", isRequired: true },
                { name: "email", kind: "scalar", type: "String", isRequired: true, isUnique: true },
                { name: "password", kind: "scalar", type: "String", isRequired: true },
                { name: "createdAt", kind: "scalar", type: "DateTime", isRequired: true, hasDefaultValue: true, default: { name: "now", args: [] } },
                { name: "articles", kind: "object", type: "Article", isRequired: false, isList: true },
            ],
        },
        { orm: "prisma" },
    );
    registerSchema(
        "Article",
        {
            name: "Article",
            fields: [
                { name: "id", kind: "scalar", type: "Int", isRequired: true, isId: true, hasDefaultValue: true, default: { name: "autoincrement", args: [] } },
                { name: "title", kind: "scalar", type: "String", isRequired: true },
                { name: "content", kind: "scalar", type: "String", isRequired: true },
                { name: "published", kind: "scalar", type: "Boolean", isRequired: true, hasDefaultValue: true, default: false },
                { name: "authorId", kind: "scalar", type: "Int", isRequired: true },
                { name: "author", kind: "object", type: "User", isRequired: true, relationFromFields: ["authorId"], relationToFields: ["id"] },
                { name: "createdAt", kind: "scalar", type: "DateTime", isRequired: true, hasDefaultValue: true, default: { name: "now", args: [] } },
                { name: "updatedAt", kind: "scalar", type: "DateTime", isRequired: true, isUpdatedAt: true },
            ],
        },
        { orm: "prisma" },
    );
    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/articles",
        mappedSchema: "Article",
        tags: "Articles",
        summary: "Article management",
    });
    setupAndWrite({ sampleDir: "prisma", outFile: "./swagger/swagger.json", projectName: "Prisma CMS API", openApiVersion: "2.0", format: "json" });
}

function regenObjection() {
    clearStorages();
    class User {
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
    }
    class Book {
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
    }
    registerSchema("User", User, { orm: "objection" });
    registerSchema("Book", Book, { orm: "objection" });
    registerDefinition(makeRouter([{ method: "post", path: "/register" }, { method: "post", path: "/login" }]), {
        basePath: "/api/auth",
        mappedSchema: "User",
        tags: "Auth",
        summary: "Authentication endpoints",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/users",
        mappedSchema: "User",
        tags: "Users",
        summary: "User management",
    });
    registerDefinition(makeRouter([{ method: "get", path: "/" }, { method: "get", path: "/:id", keys: ["id"] }, { method: "post", path: "/" }, { method: "put", path: "/:id", keys: ["id"] }, { method: "delete", path: "/:id", keys: ["id"] }]), {
        basePath: "/api/books",
        mappedSchema: "Book",
        tags: "Books",
        summary: "Book management",
    });
    setupAndWrite({ sampleDir: "objection", outFile: "./swagger/swagger.json", projectName: "Objection Library API", openApiVersion: "2.0", format: "json" });
}

regenDrizzle();
regenKnex();
regenMongoose();
regenSequelize();
regenTypeorm();
regenPrisma();
regenObjection();
console.log("Sample swagger files regenerated.");
