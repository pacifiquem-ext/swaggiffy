# Swaggiffy — Engineering TODO

This document captures the two major workstreams. Each item is described in terms of **what** must be done and **what the expected outcome is**, without prescribing implementation details.

**Status legend:** ✅ Done · ⏳ Pending

---

## Workstream 1: Valid OpenAPI Output, Extended Route Inspection, and Backward Compatibility

> **Status: ✅ COMPLETE** (implemented; covered by `test/core/openapi.output.test.ts` + extended `registerDefinition` tests; samples updated)

### Background

The swagger file Swaggiffy currently writes to disk is not a valid OpenAPI document. It is a swagger-jsdoc configuration object — a JSON blob with a top-level `swaggerDefinition` key and an `apis` array. Pasting that file into the Swagger Editor or any OpenAPI validator produces:

> "Unable to render this definition. The provided definition does not specify a valid version field."

The library then pipes this invalid file through `swagger-jsdoc` at runtime, which converts it to a real spec before handing it to swagger-ui-express. This means local UI rendering works, but the persisted file is useless to anyone who wants to share it, import it into Postman, or validate it independently.

Two further bugs live in `registerDefinition`:

1. **Security is always injected as `[{ "Bearer": ["global"] }]`** regardless of whether the user configured any security scheme or scopes. A route with no security requirement ends up claiming global Bearer auth.
2. **Only path parameters and POST/PUT bodies are ever produced.** Query string parameters, header parameters, and `multipart/form-data` / `application/x-www-form-urlencoded` parameters are never generated from route inspection.

---

### 1.1 — Output a valid OpenAPI document ✅

**What to do:**
- The file written to `outFile` must be a self-contained, valid OpenAPI document that passes validation on editor.swagger.io and any OpenAPI 3 / Swagger 2 validator.
- OpenAPI v3 (specifically `openapi: "3.0.x"`) must be the default output.
- The user must be able to opt into Swagger 2 (`swagger: "2.0"`) by setting `openApiVersion: "2.0"` in `swaggiffy.config.json`.
- The intermediary `swaggerDefinition` / `apis` wrapper format must be removed from the persisted file entirely. The swagger-jsdoc dependency can be removed from the serving path; swagger-ui-express can serve the spec directly.

**Expected outcome:**
- Opening the generated `swagger.json` (or `swagger.yaml`) in the Swagger Editor renders without errors.
- The file is directly importable into Postman, Insomnia, or any OpenAPI tooling.
- Local `/api-docs` UI continues to work exactly as before.

---

### 1.2 — YAML output support ✅

**What to do:**
- When `format: "yaml"` is set in `swaggiffy.config.json`, the generated output file must be a valid YAML document (not JSON).
- The default remains `format: "json"`.
- The `outFile` path in config should reflect the chosen extension (e.g. `swagger.yaml` vs `swagger.json`), but the library must handle both regardless of file extension.
- The in-process spec served to swagger-ui-express must work regardless of whether the backing file is JSON or YAML.

**Expected outcome:**
- Setting `format: "yaml"` produces a readable, valid YAML OpenAPI file on disk.
- `format: "json"` continues to produce a compact, valid JSON file.

---

### 1.3 — Fix security injection ✅

**What to do:**
- `registerDefinition` must not inject any `security` field unless the user explicitly passes security configuration as part of the `APIDefinitionOptions`.
- When the user does pass security config, the injected security object must reflect exactly what they passed — no hardcoded `["global"]` scope, no hardcoded `"Bearer"` scheme name.
- A route with no security configured must produce a path operation with no `security` field at all.
- The `APIDefinitionOptions` type must expose a typed `security` field so users can declare per-route or per-tag security requirements.

**Expected outcome:**
- Public (unauthenticated) routes do not appear in the generated spec with a Bearer requirement.
- Routes with explicit security options render exactly the schemes and scopes the user declared.
- No route inherits a default global security unless the user opts into it.

---

### 1.4 — Complete route parameter inspection ✅

**What to do:**
- Route inspection inside `registerDefinition` must be extended to detect and emit all OpenAPI parameter types: `path`, `query`, `header`, and `cookie` (v3) / `formData` (v2).
- `query` parameters should be extractable when the user declares them in `APIDefinitionOptions`, since Express route objects do not carry query string definitions.
- `header` parameters (e.g. `Authorization`, `X-Request-ID`) must be declarable per-route via `APIDefinitionOptions`.
- For POST/PUT/PATCH routes, the request body must use OpenAPI v3's `requestBody` / `content` structure (not the v2 `in: body` parameter) when generating v3 output. v2 output keeps the `in: body` parameter format.
- The `consumes` / `produces` fields must be treated correctly per version: they are top-level in v2 and represented via `content` media type keys in v3.

**Expected outcome:**
- A route with a custom header like `X-Auth-Token` can be documented by passing it in `APIDefinitionOptions`.
- Query parameters are represented in the spec when declared.
- POST/PUT bodies in v3 output use `requestBody` with `content["application/json"].schema` rather than a `parameters` entry with `in: "body"`.

---

### 1.5 — Backward compatibility + deprecation warning ✅

**What to do:**
- Projects that have an existing swagger file on disk in the old swagger-jsdoc config format (top-level `swaggerDefinition` key) must still get a working `/api-docs` UI — Swaggiffy must detect the old format, extract the inner definition, and serve it.
- When the old format is detected, a visible **yellow warning** must be printed to the terminal at startup, telling the user that their swagger file is in a deprecated format and they should regenerate it with the new version.
- The warning must include a clear message pointing them toward running the regeneration step.
- The deprecated path must not silently fail or crash — it must degrade gracefully.

**Expected outcome:**
- Existing users upgrading from a previous version do not see a broken UI on first boot.
- They do see a yellow terminal warning they cannot miss, explaining that their swagger file needs to be regenerated.
- Once they delete or regenerate their swagger file, the warning disappears.

---

### 1.6 — Update sample projects to demonstrate the new capabilities ✅

Each sample under `/samples` must be updated so that it works correctly with the new implementation and demonstrates a specific feature.

| Sample | Required update | Status |
|---|---|---|
| `samples/drizzle` | Switch `openApiVersion` to `"3.0"`. Valid OpenAPI v3 output. `registerSchema(..., { orm: "drizzle" })` (full extractor still pending in WS2 — interim plain fallback with warning). | ✅ |
| `samples/knex` | Keep `openApiVersion: "2.0"`. Valid Swagger 2.0 (no swagger-jsdoc wrapper). `registerSchema(..., { orm: "knex" })` (full extractor pending WS2). | ✅ |
| `samples/mongoose` | `format: "yaml"`, `outFile: ./swagger/swagger.yaml`. Valid OpenAPI YAML. | ✅ |
| `samples/sequelize` | Public `/api/auth` has no security; protected `/api/users` & `/api/products` use explicit `security: [{ bearerAuth: [] }]` plus summary/description/responses. | ✅ |
| `samples/typeorm` | Header params (`X-Request-ID`, `X-Auth-Token`); v3 `requestBody` on POST/PUT; `registerSchema(..., { orm: "typeorm" })` (full extractor pending WS2). | ✅ |

---

### 1.7 — Tests for Workstream 1 ✅

All new behaviors must have unit or integration test coverage. The following test cases are required at minimum:

- ✅ Generated spec for v3 config has `openapi: "3.0.x"` at top level, no `swaggerDefinition` wrapper.
- ✅ Generated spec for v2 config has `swagger: "2.0"` at top level, no `swaggerDefinition` wrapper.
- ✅ YAML output file is parseable YAML that matches the equivalent JSON structure.
- ✅ A route registered with no security option produces a path operation with no `security` field.
- ✅ A route registered with explicit security produces the exact security object the user passed.
- ✅ A route registered with header params produces a `parameters` entry with `in: "header"`.
- ✅ A POST route in v3 config produces a `requestBody` field, not an `in: body` parameter.
- ✅ A POST route in v2 config produces an `in: body` parameter.
- ✅ Startup with an old-format swagger file logs a yellow deprecation warning and does not crash.
- ✅ Startup with an old-format swagger file still serves the `/api-docs` UI successfully.

---

## Workstream 2: Full ORM Schema Extraction Pipeline

> **Status: ⏳ PENDING** (call signature partially landed in WS1: `orm` accepts all ORM names; only `mongoose` / `sequelize` have real extractors — others fall back to plain/class inspection with a warning until the extractors below ship)


### Background

`registerSchema` currently supports only Mongoose and Sequelize. Any other ORM either throws `"Orm is not supported"` or silently falls through to `extractPlain`, which inspects a plain JavaScript object at runtime. Plain object inspection is lossy: `registerSchema("User", { id: 0, name: "", email: "" })` tells us nothing about nullability, string length constraints, default values, foreign key relationships, or enum members. The generated swagger schema for that object contains only primitive types with no additional metadata.

The goal is to build a proper schema extraction pipeline that understands each ORM's native schema representation and converts it to a rich OpenAPI schema object.

---

### 2.1 — New `registerSchema` call signature ⏳ (partial: signature + routing accepted; full extractors pending)

**What to do:**
- The signature `registerSchema('Model Name', ClassOrObject, { orm: 'xxx' })` must be the canonical way to register an ORM schema.
- The `orm` option must accept: `'mongoose'`, `'sequelize'`, `'typeorm'`, `'prisma'`, `'knex'`, `'objection'`, `'drizzle'`.
- When `orm` is provided, Swaggiffy must route to the correct extractor for that ORM.
- When no `orm` is provided and the input is a plain object or class, `extractPlain` / `extractClassProps` remain as the fallback, but a warning must be logged telling the user they are missing type metadata and should pass an `orm` option.
- The `registerSchemas` bulk helper must accept the same updated options shape.

**Expected outcome:**
- `registerSchema("User", UserModel, { orm: "typeorm" })` extracts a fully typed schema from the TypeORM entity.
- `registerSchema("events", eventsTable, { orm: "drizzle" })` extracts a fully typed schema from the Drizzle table definition.
- Passing an unsupported ORM string is a clear, descriptive error — not a silent fallback.

---

### 2.2 — ORM extractor: Drizzle ⏳

**What to do:**
- Accept a Drizzle table definition object (the result of `pgTable`, `mysqlTable`, `sqliteTable`, etc.) as the schema input.
- Extract column names, data types, nullability (`notNull()`), default values (`default()`, `defaultNow()`), primary key status, max length (`varchar({ length: N })`), and foreign key references (`references()`).
- Map Drizzle column types to OpenAPI schema types accurately:
  - `serial` / `integer` → `integer` (format `int32`)
  - `bigint` → `integer` (format `int64`)
  - `varchar(length)` → `string` with `maxLength`
  - `text` → `string`
  - `boolean` → `boolean`
  - `timestamp` / `date` → `string` (format `date-time` or `date`)
  - `numeric` / `decimal` → `number` (format `double`)
  - `json` / `jsonb` → `object`
- `notNull()` columns must be included in the schema's `required` array.
- `default(value)` must be reflected in the property's `default` field.
- Foreign key references must be noted (e.g. a description or `x-references` extension field).

**Expected outcome (Drizzle example):**
```
events.title  → type: string, maxLength: 255, required: true
events.capacity → type: integer, default: 100
events.published → type: boolean, default: false
events.userId → type: integer, x-references: users.id (or description noting the FK)
events.description → type: string, nullable: true (not in required array)
```

---

### 2.3 — ORM extractor: TypeORM ⏳

**What to do:**
- Accept a TypeORM entity class (decorated with `@Entity`, `@Column`, etc.) as the schema input.
- Extract column metadata from TypeORM's reflection metadata (stored via decorators: `@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, `@UpdateDateColumn`, `@ManyToOne`, `@OneToMany`, etc.).
- Map TypeORM column types to OpenAPI types: `int`/`integer` → `integer`, `varchar`/`text` → `string`, `boolean` → `boolean`, `date`/`timestamp` → `string` (date-time), `float`/`decimal` → `number`.
- Respect `nullable: false` (not in `required` array when nullable), `default` values, and `length` constraints.
- Relation columns (`@ManyToOne`, etc.) should produce a reference or a description noting the relation rather than an opaque object.

---

### 2.4 — ORM extractor: Prisma ⏳

**What to do:**
- Accept a Prisma-generated model type or DMMF model descriptor as the schema input, or alternatively accept the Prisma client's internal model metadata.
- The most practical approach is to accept the DMMF (Data Model Meta Format) that Prisma exposes at runtime via `@prisma/client/runtime` or via a prisma introspect step — the implementation team should evaluate which API is most stable.
- Extract fields, types, nullability, default values, and relations from the DMMF.
- Map Prisma scalar types (`String`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`, `Bytes`) to OpenAPI equivalents.
- `@default(...)` values must appear in the OpenAPI schema's `default` field.
- Required (non-optional, non-nullable) fields must be listed in `required`.

---

### 2.5 — ORM extractor: Knex ⏳

**What to do:**
- Knex is a query builder with no schema-definition objects at the application layer; schema is defined in migration files, not in model classes.
- The extractor should accept a plain JavaScript/TypeScript object that describes the table schema, annotated with Swaggiffy-specific metadata — for example a definition object like:
  ```ts
  registerSchema("User", {
    id:        { type: "integer", primaryKey: true },
    name:      { type: "string", notNull: true, maxLength: 255 },
    email:     { type: "string", notNull: true },
    createdAt: { type: "datetime" },
  }, { orm: "knex" });
  ```
- The extractor reads this descriptor and produces a correct OpenAPI schema with types, `required`, `maxLength`, `default`, etc.
- Alternatively, if the team determines a richer approach (e.g. parsing Knex migration files), that is acceptable — the requirement is that the output is richer than `extractPlain`.

---

### 2.6 — ORM extractor: Objection.js ⏳

**What to do:**
- Accept an Objection.js model class (extends `Model`) as the schema input.
- Objection models optionally expose a static `jsonSchema` property that is already an OpenAPI-compatible JSON Schema object. When present, this must be used directly as the source of truth for the schema.
- When `jsonSchema` is absent, fall back to inspecting the class instance properties with a warning that type information is limited.
- Relation definitions from `relationMappings` may be included as `$ref` or descriptive fields.

**Expected outcome:** If the user defines `static jsonSchema = { properties: { id: { type: "integer" }, ... } }`, the generated swagger schema reflects exactly that definition.

---

### 2.7 — ORM extractor: Sequelize (upgrade) ⏳

**What to do:**
- The existing `extractSequelize` already handles basic type mapping but has known gaps: it does not extract `allowNull`, `defaultValue`, field-level `validate` constraints, or association metadata.
- Upgrade the extractor to read `allowNull` and add non-nullable fields to the `required` array.
- Read `defaultValue` and map it to the `default` field in the OpenAPI schema.
- Read string-type `length` constraint and map to `maxLength`.
- The `console.log` debug statement inside the extractor must be removed.

---

### 2.8 — ORM extractor: Mongoose (upgrade) ⏳

**What to do:**
- The existing `extractMongoose` handles type mapping but does not extract `required`, `default`, `minlength`, `maxlength`, `min`, `max`, or `enum` from path options.
- Upgrade the extractor to read these SchemaPath options and reflect them in the OpenAPI property:
  - `required: true` on a path → field appears in `required` array.
  - `default` value → mapped to `default`.
  - `minlength` / `maxlength` → `minLength` / `maxLength`.
  - `min` / `max` → `minimum` / `maximum`.
  - `enum` values → `enum` array in the OpenAPI property.

---

### 2.9 — Update sample projects for new ORM extractors ⏳

All existing samples must be updated to use the new `{ orm: 'xxx' }` syntax so they continue to work after the extractor refactor.

| Sample | Required update |
|---|---|
| `samples/drizzle` | Replace plain object `registerSchema` calls with the actual Drizzle table objects: `registerSchema("User", users, { orm: "drizzle" })` and `registerSchema("Event", events, { orm: "drizzle" })`. The generated schema must reflect all column constraints from the Drizzle table definition. |
| `samples/knex` | Replace plain object calls with the Knex descriptor format: `registerSchema("User", knexUserDescriptor, { orm: "knex" })`. The generated schema must be richer than the current plain-object output. |
| `samples/mongoose` | Ensure `registerSchema` calls use `{ orm: "mongoose" }` and that the upgraded extractor picks up `required`, `default`, and any `enum` fields defined on the Mongoose schemas. |
| `samples/sequelize` | Ensure `registerSchema` calls use `{ orm: "sequelize" }` with the upgraded extractor so `allowNull: false` fields appear in `required` and default values appear in the schema. |
| `samples/typeorm` | Replace `@Schema` decorator usage with `registerSchema(User, { orm: "typeorm" })` calls OR verify the decorator correctly delegates to the TypeORM extractor. The generated schema must reflect TypeORM column decorators. |
| `samples/objection` | Add `static jsonSchema` definitions to the Objection models and confirm the extractor reads them; or use the `{ orm: "objection" }` fallback path with a clear example. |
| `samples/prisma` | Update `registerSchema` calls to use `{ orm: "prisma" }` and the DMMF/model-based extractor. Remove the class-based `@Schema` decorator approach in favour of the ORM-aware path. |

---

### 2.10 — Tests for Workstream 2 ⏳

Each ORM extractor must have dedicated unit tests. The following are required at minimum:

- **Drizzle**: given a `pgTable` definition with `notNull()`, `default()`, `varchar({ length })`, and `references()` columns, the extracted schema has correct types, `required` array, `maxLength`, `default`, and a reference note on the FK column.
- **TypeORM**: given an entity class with `@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, the extracted schema has correct types and required fields.
- **Prisma**: given a DMMF model descriptor (can be a fixture/mock), the extracted schema has correct types, `required` fields, and `default` values.
- **Knex**: given a descriptor object with typed fields, the extracted schema has correct types and constraints.
- **Objection** (with `jsonSchema`): the extracted schema exactly mirrors the declared `jsonSchema`.
- **Objection** (without `jsonSchema`): falls back gracefully with a warning.
- **Sequelize upgrade**: `allowNull: false` → field in `required`; `defaultValue` → `default`; `STRING(255)` → `maxLength: 255`.
- **Mongoose upgrade**: `required: true` → field in `required`; `enum: [...]` → `enum` in property; `minlength`/`maxlength` → `minLength`/`maxLength`.
- **Unknown ORM**: passing `{ orm: "someUnknown" }` produces a clear error, not a silent fallback.
- **Plain object fallback without orm**: logs a warning, still registers the schema using basic type inference.

---

## Cross-cutting: Documentation

The README and any inline JSDoc on public APIs must be updated to reflect:

1. The new canonical output format (valid OpenAPI, not swagger-jsdoc config).
2. The `openApiVersion` and `format` configuration options and their valid values.
3. The updated `registerSchema` signature with `{ orm: 'xxx' }`.
4. A table listing all supported ORMs with a one-line description of what metadata each extractor captures.
5. The `security` option on `APIDefinitionOptions` and how to declare per-route security.
6. The deprecation warning and how to clear it (regenerate the swagger file).
7. Updated code examples for each sample ORM showing the new call syntax.

---

## Out of Scope for These Workstreams

- Support for non-Express frameworks (Fastify, Koa, Hapi).
- GraphQL schema generation.
- OpenAPI v3.1 or v3.2 specific features (discriminators, webhooks).
- Authentication flow automation (OAuth2 redirect handling).
- Any CLI changes beyond what is needed to support the new output format.
