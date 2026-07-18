import { SwaggiffyError } from "../errors/SwaggiffyError";
import { TClassDef, TClassProp, TSwaggerDataType, TSwaggerNumberFormats, TSwaggerStringFormats } from "../typings";
import { serializeDefault, toClassDef } from "./orm.helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

type PrismaField = {
    name: string;
    kind?: string;
    type: string;
    isRequired?: boolean;
    isList?: boolean;
    isId?: boolean;
    isUnique?: boolean;
    hasDefaultValue?: boolean;
    default?: unknown;
    relationName?: string;
    relationFromFields?: string[];
    relationToFields?: string[];
    documentation?: string;
};

type PrismaModel = {
    name?: string;
    fields: PrismaField[];
};

const PRISMA_SCALARS: Record<string, { type: TSwaggerDataType; format?: TSwaggerNumberFormats | TSwaggerStringFormats }> = {
    "String": { type: "string" },
    Int: { type: "integer", format: "int32" },
    BigInt: { type: "integer", format: "int64" },
    Float: { type: "number", format: "double" },
    Decimal: { type: "number", format: "double" },
    "Boolean": { type: "boolean" },
    DateTime: { type: "string", format: "date-time" },
    Json: { type: "object" },
    Bytes: { type: "string", format: "byte" },
};

function findModels(schema: unknown): PrismaModel[] | null {
    const s = schema as AnyRec;
    if (!s) return null;
    if (Array.isArray(s)) return s as PrismaModel[];
    if (Array.isArray(s.fields)) return [s as PrismaModel];
    if (s.dmmf?.datamodel?.models) return s.dmmf.datamodel.models;
    if (s.datamodel?.models) return s.datamodel.models;
    if (Array.isArray(s.models)) return s.models;
    return null;
}

function pickModel(schema: unknown, name?: string): PrismaModel {
    const models = findModels(schema);
    if (!models || models.length === 0) {
        throw new SwaggiffyError(
            "Prisma extractor expects a DMMF model (or Prisma.dmmf / { fields: [...] }). " +
                'Example: registerSchema("User", Prisma, { orm: "prisma" })',
        );
    }
    if (name) {
        const match = models.find((m) => m.name === name);
        if (match) return match;
    }
    if (models.length === 1) return models[0];
    if (name) {
        throw new SwaggiffyError(`Prisma DMMF has no model named "${name}". Found: ${models.map((m) => m.name).join(", ")}`);
    }
    return models[0];
}

/**
 * Extract a TClassDef from a Prisma DMMF model, the Prisma namespace, or a
 * DMMF-shaped `{ fields: [...] }` descriptor.
 */
export function extractPrisma(schema: unknown, name?: string): TClassDef {
    const model = pickModel(schema, name);
    const props: TClassProp[] = [];

    for (const field of model.fields || []) {
        const isRelation = field.kind === "object";
        const scalar = PRISMA_SCALARS[field.type];
        const required = field.isRequired === true && field.isList !== true;

        const mapped = isRelation
            ? { type: (field.isList ? "array" : "object") as TSwaggerDataType, format: undefined }
            : scalar || { type: "string" as TSwaggerDataType, format: undefined };

        const item: TClassProp = {
            prop: field.name,
            type: mapped.type,
            format: mapped.format,
            required: required || undefined,
            nullable: required ? undefined : true,
            description: field.documentation,
        };

        if (field.hasDefaultValue) {
            const def = serializeDefault(field.default);
            if (def !== undefined) item.default = def;
        }

        if (isRelation) {
            item.references = field.type;
            const from = (field.relationFromFields || []).join(", ");
            const to = (field.relationToFields || []).join(", ");
            item.description =
                field.documentation ||
                (from && to ? `Relation to ${field.type} (${from} → ${to})` : `Relation to ${field.type}`);
            if (field.isList) item.items = { type: "object" };
        }

        props.push(item);
    }

    return toClassDef(name || model.name, props);
}
