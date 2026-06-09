/**
 * Swaggiffy performance benchmarks.
 * Run: npm run bench
 *
 * Each suite covers one hot path. Results are printed as ops/sec and ns/op.
 * A warmup phase runs before timing to let V8 JIT-compile the hot functions.
 */

import "reflect-metadata";
import { performance } from "perf_hooks";
import mongoose from "mongoose";
import { Utility } from "../lib/utils/Utility";
import { SchemaExtractor } from "../lib/extractors/schema.extractor";
import { ValidationUtils } from "../lib/utils/ValidationUtils";
import { registerSchema, registerSchemas } from "../lib/helpers/registerSchema";
import { registerDefinition } from "../lib/helpers/registerDefinition";
import { getSchemaMetadataStorage, getAPIDefinitionMetadataStorage } from "../lib/globals";
import { Schema } from "../lib/decorators/Schema";
import { SchemaMetadata } from "../lib/storage/types/SchemaMetadata";
import { APIDefinitionMetadata } from "../lib/storage/types/APIDefinitionMetadata";

// ── Harness ───────────────────────────────────────────────────────────────────

interface BenchResult {
    name: string;
    iterations: number;
    totalMs: number;
    opsPerSec: number;
    nsPerOp: number;
}

function bench(name: string, fn: () => void, iterations = 100_000, warmupIters = 500): BenchResult {
    for (let i = 0; i < warmupIters; i++) fn();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const totalMs = performance.now() - start;
    return {
        name,
        iterations,
        totalMs,
        opsPerSec: Math.round(iterations / (totalMs / 1000)),
        nsPerOp: (totalMs * 1_000_000) / iterations,
    };
}

const allResults: BenchResult[] = [];

function run(name: string, fn: () => void, iterations = 100_000, warmup = 500): BenchResult {
    const r = bench(name, fn, iterations, warmup);
    allResults.push(r);
    const ops = r.opsPerSec.toLocaleString().padStart(14);
    const ns  = r.nsPerOp.toFixed(1).padStart(10);
    console.log(`  ${r.name.padEnd(56)} ${ops} ops/sec  ${ns} ns/op`);
    return r;
}

function section(title: string) {
    console.log(`\n${"─".repeat(90)}`);
    console.log(`  ${title}`);
    console.log("─".repeat(90));
}

function clearStorage() {
    (getSchemaMetadataStorage().schemas as unknown[]).splice(0);
    (getAPIDefinitionMetadataStorage().apiDefinitions as unknown[]).splice(0);
}

// Suppress the debug console.log left in extractSequelize for these benchmarks.
function withSilentConsole(fn: () => void) {
    const orig = console.log;
    console.log = () => { /* noop */ };
    try { fn(); } finally { console.log = orig; }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeClassDef(n: number, name = `C${n}`) {
    return {
        name,
        props: Array.from({ length: n }, (_, i) => ({
            prop: `f${i}`,
            type: (["number", "string", "boolean"] as const)[i % 3],
        })),
    };
}

function makeSchemaMeta(n: number): SchemaMetadata[] {
    return Array.from({ length: n }, (_, i) => ({
        target: {},
        name: `S${i}`,
        swaggerDefinition: { [`S${i}`]: { type: "object" as const, properties: {} } },
    }));
}

function makeAPIDefMeta(n: number): APIDefinitionMetadata[] {
    return Array.from({ length: n }, (_, i) => ({
        router: {} as any,
        apiDefinition: {
            pathString: i % 4 === 0
                ? `/api/res${Math.floor(i / 4)}`
                : `/api/res${Math.floor(i / 4)}/:id`,
            method: (["get", "post", "put", "delete"] as const)[i % 4],
            tags: ["Resource"],
            meta: {
                summary: "",
                description: "",
                parameters: [],
                produces: ["application/json" as const],
                consumes: ["application/json" as const],
                responses: { "200": { description: "OK" } },
                security: [{ Bearer: ["global"] }],
            },
        },
    }));
}

function makeRouter(n: number) {
    return {
        stack: Array.from({ length: n }, (_, i) => ({
            route: {
                path: i % 2 === 0 ? `/item${i}` : `/item${i}/:id`,
                stack: [{ method: (["get", "post", "put", "delete"])[i % 4] }],
            },
            keys: i % 2 === 0 ? [] : [{ name: "id" }],
        })),
    };
}

const classDef3   = makeClassDef(3);
const classDef15  = makeClassDef(15);
const classDef50  = makeClassDef(50);

const schemaMeta5   = makeSchemaMeta(5);
const schemaMeta20  = makeSchemaMeta(20);
const schemaMeta100 = makeSchemaMeta(100);

const apiMeta10  = makeAPIDefMeta(10);
const apiMeta40  = makeAPIDefMeta(40);
const apiMeta200 = makeAPIDefMeta(200);

const router5  = makeRouter(5);
const router20 = makeRouter(20);
const router50 = makeRouter(50);

const mongoSchema3 = new mongoose.Schema({
    name: String, email: String, createdAt: Date,
});
const mongoSchema15 = new mongoose.Schema(
    Object.fromEntries(Array.from({ length: 15 }, (_, i) => [
        `f${i}`, [String, Number, Boolean][i % 3],
    ])),
);
const mongoSchema50 = new mongoose.Schema(
    Object.fromEntries(Array.from({ length: 50 }, (_, i) => [
        `f${i}`, [String, Number, Boolean][i % 3],
    ])),
);

const plainObj3  = { id: 0, name: "", active: false };
const plainObj15 = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`f${i}`, i % 2 === 0 ? 0 : ""]));
const plainObj50 = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`f${i}`, i % 2 === 0 ? 0 : ""]));

class EntitySmall  { id = 0; name = ""; active = false; }
class EntityMedium {
    f0=0;f1="";f2=false;f3=0;f4="";f5=false;f6=0;f7="";f8=false;
    f9=0;f10="";f11=false;f12=0;f13="";f14=false;
}

// ── Suite 1 — Type casting ────────────────────────────────────────────────────

section("1. Type casting  (Utility.cast*Type)");

run("castJSType — 'string'",        () => Utility.castJSType("string"),        1_000_000);
run("castJSType — 'number'",        () => Utility.castJSType("number"),        1_000_000);
run("castJSType — 'boolean'",       () => Utility.castJSType("boolean"),       1_000_000);
run("castJSType — 'object'",        () => Utility.castJSType("object"),        1_000_000);
run("castJSType — unknown fallback",() => Utility.castJSType("symbol"),        1_000_000);

run("castMongooseType — 'String'",  () => Utility.castMongooseType("String"),  1_000_000);
run("castMongooseType — 'ObjectID'",() => Utility.castMongooseType("ObjectID"),1_000_000);
run("castMongooseType — 'Date'",    () => Utility.castMongooseType("Date"),    1_000_000);
run("castMongooseType — fallback",  () => Utility.castMongooseType("Decimal128"),1_000_000);

// castSequelizeType has a stray console.log — suppress it here.
run("castSequelizeType — 'STRING'",  () => { withSilentConsole(() => Utility.castSequelizeType("STRING")); },  200_000);
run("castSequelizeType — 'INTEGER'", () => { withSilentConsole(() => Utility.castSequelizeType("INTEGER")); }, 200_000);
run("castSequelizeType — 'DATE'",    () => { withSilentConsole(() => Utility.castSequelizeType("DATE")); },    200_000);
run("castSequelizeType — fallback",  () => { withSilentConsole(() => Utility.castSequelizeType("JSONB")); },   200_000);

// ── Suite 2 — Schema definition generation (Object.assign loop) ───────────────

section("2. Schema definition generation  (Utility.genSchemaDef)");
console.log("  NOTE: genSchemaDef uses Object.assign inside a reversed loop — O(n²) in prop count.");

run("genSchemaDef —  3 props",  () => Utility.genSchemaDef(classDef3),  100_000);
run("genSchemaDef — 15 props",  () => Utility.genSchemaDef(classDef15), 100_000);
run("genSchemaDef — 50 props",  () => Utility.genSchemaDef(classDef50),  20_000);

// ── Suite 3 — Schema extraction ───────────────────────────────────────────────

section("3. Schema extraction  (SchemaExtractor)");

run("extractClassProps —  3 props",  () => SchemaExtractor.extractClassProps(EntitySmall),  50_000);
run("extractClassProps — 15 props",  () => SchemaExtractor.extractClassProps(EntityMedium), 50_000);

run("extractPlain —  3 props",  () => SchemaExtractor.extractPlain(plainObj3),  200_000);
run("extractPlain — 15 props",  () => SchemaExtractor.extractPlain(plainObj15), 100_000);
run("extractPlain — 50 props",  () => SchemaExtractor.extractPlain(plainObj50),  20_000);

// Mongoose schema.paths includes _id by default — actual path count is n+1.
run("extractMongoose —  ~4 paths",  () => SchemaExtractor.extractMongoose(mongoSchema3),  50_000);
run("extractMongoose — ~16 paths",  () => SchemaExtractor.extractMongoose(mongoSchema15), 20_000);
run("extractMongoose — ~51 paths",  () => SchemaExtractor.extractMongoose(mongoSchema50), 10_000);

// ── Suite 4 — Metadata merging (spread-in-loop, O(n²)) ───────────────────────

section("4. Metadata merging  (Utility.toSwaggerSchema — spread in loop)");
console.log("  NOTE: toSwaggerSchema does { ...acc, ...{ [k]: v } } per item — allocation grows with n.");

run("toSwaggerSchema —   5 schemas",  () => Utility.toSwaggerSchema(schemaMeta5),     50_000);
run("toSwaggerSchema —  20 schemas",  () => Utility.toSwaggerSchema(schemaMeta20),    20_000);
run("toSwaggerSchema — 100 schemas",  () => Utility.toSwaggerSchema(schemaMeta100),    2_000);

// ── Suite 5 — Path string processing ─────────────────────────────────────────

section("5. Path string processing  (ValidationUtils.cleanSwaggerPathString)");
console.log("  NOTE: uses split/map/join array allocation on every call, even for paths without params.");

run("cleanSwaggerPathString — no params",     () => ValidationUtils.cleanSwaggerPathString("/api/users"),             1_000_000);
run("cleanSwaggerPathString — 1 param",       () => ValidationUtils.cleanSwaggerPathString("/api/users/:id"),         1_000_000);
run("cleanSwaggerPathString — 2 params",      () => ValidationUtils.cleanSwaggerPathString("/api/users/:id/posts/:pid"), 1_000_000);

// ── Suite 6 — Full registration pipeline ─────────────────────────────────────

section("6. Full registration pipeline  (registerSchema / registerSchemas)");

run("registerSchema — plain, 3 props", () => {
    clearStorage();
    registerSchema("U", plainObj3);
}, 10_000, 100);

run("registerSchema — plain, 15 props", () => {
    clearStorage();
    registerSchema("U", plainObj15);
}, 10_000, 100);

run("registerSchemas — bulk 10 schemas, 3 props each", () => {
    clearStorage();
    registerSchemas(Array.from({ length: 10 }, (_, i) => ({ name: `S${i}`, schema: plainObj3 })));
}, 5_000, 50);

run("registerSchemas — bulk 50 schemas, 3 props each", () => {
    clearStorage();
    registerSchemas(Array.from({ length: 50 }, (_, i) => ({ name: `S${i}`, schema: plainObj3 })));
}, 2_000, 20);

// ── Suite 7 — @Schema decorator ───────────────────────────────────────────────

section("7. @Schema decorator  (instantiation + extraction + genSchemaDef + push)");

run("@Schema — 3 props", () => {
    clearStorage();
    @Schema("M3") class M3 { id = 0; name = ""; active = false; }
}, 10_000, 100);

run("@Schema — 15 props", () => {
    clearStorage();
    @Schema("M15") class M15 {
        f0=0;f1="";f2=false;f3=0;f4="";f5=false;
        f6=0;f7="";f8=false;f9=0;f10="";f11=false;f12=0;f13="";f14=false;
    }
}, 10_000, 100);

// ── Suite 8 — registerDefinition ─────────────────────────────────────────────

section("8. Route introspection  (registerDefinition)");

run("registerDefinition —  5 routes", () => {
    clearStorage();
    registerDefinition(router5  as any, { basePath: "/api", mappedSchema: "Res", tags: "Res" });
}, 5_000, 50);

run("registerDefinition — 20 routes", () => {
    clearStorage();
    registerDefinition(router20 as any, { basePath: "/api", mappedSchema: "Res", tags: "Res" });
}, 5_000, 50);

run("registerDefinition — 50 routes", () => {
    clearStorage();
    registerDefinition(router50 as any, { basePath: "/api", mappedSchema: "Res", tags: "Res" });
}, 2_000, 20);

// ── Suite 9 — toSwaggerAPIDefinition (O(n²) filter-in-loop) ──────────────────

section("9. API definition assembly  (Utility.toSwaggerAPIDefinition — filter inside loop)");
console.log("  NOTE: outer loop over uniquePaths; inner array.filter() re-scans full array each time.");

run("toSwaggerAPIDefinition —  10 routes",  () => Utility.toSwaggerAPIDefinition(apiMeta10  as any), 10_000);
run("toSwaggerAPIDefinition —  40 routes",  () => Utility.toSwaggerAPIDefinition(apiMeta40  as any),  5_000);
run("toSwaggerAPIDefinition — 200 routes",  () => Utility.toSwaggerAPIDefinition(apiMeta200 as any),    500);

// ── Summary ───────────────────────────────────────────────────────────────────

section("Top 10 slowest operations (by ns/op)");
[...allResults]
    .sort((a, b) => b.nsPerOp - a.nsPerOp)
    .slice(0, 10)
    .forEach((r) => {
        const ops = r.opsPerSec.toLocaleString().padStart(14);
        const ns  = r.nsPerOp.toFixed(1).padStart(10);
        console.log(`  ${r.name.padEnd(56)} ${ops} ops/sec  ${ns} ns/op`);
    });

console.log("\nDone.\n");
