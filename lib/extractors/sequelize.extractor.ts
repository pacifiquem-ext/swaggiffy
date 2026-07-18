import { TClassDef, TClassProp } from "../typings";
import { formatReference, mapSqlishType, serializeDefault, toClassDef, unwrapConstraint } from "./orm.helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

function resolveSequelizeAttributes(schema: unknown): AnyRec {
    const s = schema as AnyRec;
    if (!s) return {};
    if (s.rawAttributes && typeof s.rawAttributes === "object") return s.rawAttributes;
    if (typeof s.getAttributes === "function") return s.getAttributes();
    if (s.tableAttributes && typeof s.tableAttributes === "object") return s.tableAttributes;
    return s;
}

function sequelizeTypeKey(attr: AnyRec): string {
    const t = attr?.type;
    if (!t) return "";
    if (typeof t === "string") return t;
    if (t.key) return String(t.key);
    if (t.constructor?.key) return String(t.constructor.key);
    return String(t.constructor?.name || "");
}

function sequelizeLength(attr: AnyRec): number | undefined {
    const t = attr?.type;
    if (!t) return undefined;
    const fromOptions = unwrapConstraint(t.options?.length);
    if (fromOptions !== undefined) return fromOptions;
    return unwrapConstraint(t._length);
}

function sequelizeReferences(attr: AnyRec): string | undefined {
    const refs = attr?.references;
    if (!refs) return undefined;
    if (typeof refs === "string") return refs;
    const model = typeof refs.model === "string" ? refs.model : refs.model?.name || refs.model?.tableName;
    const key = refs.key || "id";
    return formatReference(model, key);
}

/**
 * Extract a TClassDef from a Sequelize model class or its rawAttributes.
 * Reads allowNull, defaultValue, STRING(n) length, and association refs.
 */
export function extractSequelize(schema: unknown, name?: string): TClassDef {
    const attrs = resolveSequelizeAttributes(schema);
    const props: TClassProp[] = [];

    for (const prop of Object.keys(attrs)) {
        const attr = attrs[prop] || {};
        const mapped = mapSqlishType(sequelizeTypeKey(attr));
        const allowNull = attr.allowNull !== false && !attr.primaryKey;
        const required = !allowNull;

        const field: TClassProp = {
            prop,
            type: mapped.type,
            format: mapped.format,
            required: required || undefined,
            nullable: allowNull || undefined,
        };

        const def = serializeDefault(attr.defaultValue);
        if (def !== undefined) field.default = def;

        const length = sequelizeLength(attr);
        if (length !== undefined && field.type === "string") field.maxLength = length;

        const refs = sequelizeReferences(attr);
        if (refs) {
            field.references = refs;
            field.description = `Foreign key referencing ${refs}`;
        }

        if (attr.comment && typeof attr.comment === "string") {
            field.description = attr.comment;
        }

        const enumVals = attr.type?.values || attr.values;
        if (Array.isArray(enumVals) && enumVals.length) {
            field.enum = enumVals;
        }

        props.push(field);
    }

    return toClassDef(name, props);
}
