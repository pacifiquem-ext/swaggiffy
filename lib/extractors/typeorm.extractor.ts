import { SwaggiffyError } from "../errors/SwaggiffyError";
import { TClassDef, TClassProp } from "../typings";
import { mapSqlishType, serializeDefault, toClassDef, tryRequire, unwrapConstraint } from "./orm.helpers";
import { PlatformTools } from "../platform/PlatformTools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

function loadTypeOrmStorage(): AnyRec {
    const typeorm = tryRequire<AnyRec>("typeorm");
    if (!typeorm || typeof typeorm.getMetadataArgsStorage !== "function") {
        throw new SwaggiffyError(
            'The "typeorm" package is required to extract TypeORM entities. Install it in the consuming project.',
        );
    }
    return typeorm.getMetadataArgsStorage();
}

function matchesTarget(entryTarget: unknown, entity: unknown): boolean {
    if (entryTarget === entity) return true;
    if (typeof entity === "function" && typeof entryTarget === "string") {
        return entryTarget === (entity as { name?: string }).name;
    }
    return false;
}

function resolveRelationTarget(rel: AnyRec): string | undefined {
    try {
        const t = typeof rel.type === "function" ? rel.type() : rel.type;
        if (typeof t === "function") return t.name;
        if (typeof t === "string") return t;
    } catch {
        /* circular / lazy type */
    }
    return undefined;
}

/**
 * Extract a TClassDef from a TypeORM entity class using decorator metadata
 * (`@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn`, relations).
 */
export function extractTypeORM(schema: unknown, name?: string): TClassDef {
    if (typeof schema !== "function") {
        throw new SwaggiffyError('TypeORM extractor expects an entity class: registerSchema("Name", Entity, { orm: "typeorm" })');
    }

    const storage = loadTypeOrmStorage();
    const columns: AnyRec[] = (storage.columns || []).filter((c: AnyRec) => matchesTarget(c.target, schema));
    const relations: AnyRec[] = (storage.relations || []).filter((r: AnyRec) => matchesTarget(r.target, schema));

    if (columns.length === 0) {
        PlatformTools.logWarn(
            `[swaggiffy] TypeORM entity "${(schema as { name?: string }).name || name}" has no column metadata. ` +
                "Ensure `reflect-metadata` is imported and the class is decorated with @Entity / @Column. Falling back to class inspection.",
        );
        // Lazy require avoids a circular import with SchemaExtractor.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SchemaExtractor } = require("./schema.extractor") as typeof import("./schema.extractor");
        return SchemaExtractor.extractClassProps(schema as new () => unknown, name);
    }

    const props: TClassProp[] = [];
    const seen = new Set<string>();

    for (const col of columns) {
        const options = col.options || {};
        const mode: string = col.mode || "regular";
        let typeHint: unknown = options.type;
        if (!typeHint && typeof Reflect !== "undefined" && typeof Reflect.getMetadata === "function") {
            typeHint = Reflect.getMetadata("design:type", (schema as { prototype: object }).prototype, col.propertyName);
        }
        if (mode === "createDate" || mode === "updateDate" || mode === "deleteDate") {
            typeHint = typeHint || "timestamp";
        }
        if (options.primary && !typeHint) typeHint = "int";

        const mapped = mapSqlishType(typeHint);
        if (mapped.type === "object" && typeof schema === "function") {
            try {
                const sample = new (schema as new () => Record<string, unknown>)();
                const inferred = typeof sample[col.propertyName];
                if (inferred === "string" || inferred === "number" || inferred === "boolean") {
                    const fromJs = mapSqlishType(inferred === "number" && options.primary ? "int" : inferred);
                    mapped.type = fromJs.type;
                    mapped.format = fromJs.format;
                } else if (sample[col.propertyName] instanceof Date) {
                    mapped.type = "string";
                    mapped.format = "date-time";
                }
            } catch {
                /* unconstructable entity */
            }
        }
        if (options.primary && mapped.type === "number") {
            mapped.type = "integer";
            mapped.format = "int32";
        }
        const nullable = options.nullable === true;
        const required = !nullable;

        const field: TClassProp = {
            prop: col.propertyName,
            type: mapped.type,
            format: mapped.format,
            required: required || undefined,
            nullable: nullable || undefined,
        };

        const length = unwrapConstraint(options.length);
        if (length !== undefined && field.type === "string") field.maxLength = length;

        const def = serializeDefault(options.default);
        if (def !== undefined) field.default = def;
        else if (mode === "createDate" || mode === "updateDate") field.default = "now()";

        if (Array.isArray(options.enum) && options.enum.length) {
            field.enum = options.enum.filter((v: unknown) => typeof v !== "object");
        }

        if (options.comment) field.description = String(options.comment);

        props.push(field);
        seen.add(col.propertyName);
    }

    for (const rel of relations) {
        if (seen.has(rel.propertyName)) continue;
        const target = resolveRelationTarget(rel);
        const isToMany = rel.relationType === "one-to-many" || rel.relationType === "many-to-many";
        props.push({
            prop: rel.propertyName,
            type: isToMany ? "array" : "object",
            required: undefined,
            nullable: true,
            references: target,
            description: target
                ? `${rel.relationType || "relation"} to ${target}`
                : `${rel.relationType || "relation"}`,
            items: isToMany ? { type: "object" } : undefined,
        });
    }

    return toClassDef(name || (schema as { name?: string }).name, props);
}
