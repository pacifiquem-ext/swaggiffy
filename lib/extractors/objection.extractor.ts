import { TClassDef, TClassProp, TSwaggerDataType } from "../typings";
import { PlatformTools } from "../platform/PlatformTools";
import { formatReference, mapSqlishType, toClassDef } from "./orm.helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

function jsonSchemaType(raw: unknown): TSwaggerDataType {
    if (Array.isArray(raw)) {
        const nonNull = raw.find((t) => t !== "null");
        return mapSqlishType(nonNull || "object").type;
    }
    return mapSqlishType(raw || "object").type;
}

function isNullableType(raw: unknown): boolean {
    return Array.isArray(raw) && raw.includes("null");
}

function relationTarget(mapping: AnyRec): string | undefined {
    const modelClass = mapping.modelClass;
    if (!modelClass) {
        const to = mapping.join?.to;
        if (typeof to === "string" && to.includes(".")) return to;
        return undefined;
    }
    if (typeof modelClass === "string") return modelClass;
    if (typeof modelClass === "function") return modelClass.name;
    if (modelClass && typeof modelClass === "object" && modelClass.name) return String(modelClass.name);
    return undefined;
}

function extractFromJsonSchema(jsonSchema: AnyRec, name?: string, relationMappings?: AnyRec): TClassDef {
    const properties: AnyRec = jsonSchema.properties || {};
    const requiredList: string[] = Array.isArray(jsonSchema.required) ? jsonSchema.required : [];
    const requiredSet = new Set(requiredList);
    const props: TClassProp[] = [];

    for (const prop of Object.keys(properties)) {
        const spec = properties[prop] || {};
        const mapped = mapSqlishType(Array.isArray(spec.type) ? spec.type.find((t: string) => t !== "null") : spec.type);
        const field: TClassProp = {
            prop,
            type: spec.type ? jsonSchemaType(spec.type) : mapped.type,
            format: spec.format || mapped.format,
            required: requiredSet.has(prop) || undefined,
            nullable: spec.nullable === true || isNullableType(spec.type) || undefined,
            description: spec.description,
            default: spec.default,
            maxLength: spec.maxLength,
            minLength: spec.minLength,
            minimum: spec.minimum,
            maximum: spec.maximum,
            enum: Array.isArray(spec.enum) ? spec.enum : undefined,
            items: spec.items,
        };

        if (relationMappings && relationMappings[prop]) {
            const target = relationTarget(relationMappings[prop]);
            if (target) {
                field.references = target;
                if (!field.description) field.description = `Relation to ${target}`;
            }
        }

        props.push(field);
    }

    if (relationMappings) {
        const existing = new Set(props.map((p) => p.prop));
        for (const [relName, mapping] of Object.entries(relationMappings)) {
            if (existing.has(relName)) continue;
            const target = relationTarget(mapping as AnyRec);
            const joinTo = (mapping as AnyRec).join?.to;
            const refs = typeof joinTo === "string" ? joinTo : target;
            props.push({
                prop: relName,
                type: "object",
                nullable: true,
                references: refs ? formatReference(undefined, refs) || refs : undefined,
                description: refs ? `Relation to ${refs}` : "Relation",
            });
        }
    }

    return toClassDef(name, props);
}

/**
 * Extract a TClassDef from an Objection.js model class.
 * Prefer `static jsonSchema`; fall back to class-property inspection with a warning.
 */
export function extractObjection(schema: unknown, name?: string): TClassDef {
    const Model = schema as AnyRec;
    const jsonSchema = Model?.jsonSchema || (typeof schema === "function" ? (schema as AnyRec).jsonSchema : undefined);
    const relationMappings =
        typeof Model?.relationMappings === "function" ? Model.relationMappings() : Model?.relationMappings;

    if (jsonSchema && typeof jsonSchema === "object" && jsonSchema.properties) {
        const modelName = name || Model.name || jsonSchema.title;
        return extractFromJsonSchema(jsonSchema, modelName, relationMappings);
    }

    PlatformTools.logWarn(
        `[swaggiffy] Objection model "${name || Model?.name || "unknown"}" has no static jsonSchema; ` +
            "falling back to class-property inspection. Type, nullability, and constraint metadata will be limited.",
    );

    // Lazy require avoids a circular import with SchemaExtractor.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SchemaExtractor } = require("./schema.extractor") as typeof import("./schema.extractor");
    if (typeof schema === "function") {
        return SchemaExtractor.extractClassProps(schema as new () => unknown, name);
    }
    return SchemaExtractor.extractPlain(schema as AnyRec, name);
}
