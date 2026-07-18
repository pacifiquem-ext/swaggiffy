import { SwaggiffyError } from "../errors/SwaggiffyError";
import { TClassDef, TClassProp } from "../typings";
import { formatReference, mapSqlishType, serializeDefault, toClassDef, unwrapConstraint } from "./orm.helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string, any>;

function isDescriptor(value: unknown): value is AnyRec {
    return Boolean(value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date));
}

function looksLikeKnexDescriptor(schema: unknown): boolean {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
    const values = Object.values(schema as AnyRec);
    if (values.length === 0) return false;
    return values.every((v) => isDescriptor(v) && typeof (v as AnyRec).type === "string");
}

function refFrom(desc: AnyRec): string | undefined {
    const refs = desc.references ?? desc.ref ?? desc.foreignKey;
    if (!refs) return undefined;
    if (typeof refs === "string") return refs;
    const table = refs.table || refs.model || refs.inTable;
    const column = refs.column || refs.key || refs.references || "id";
    return formatReference(table, column);
}

/**
 * Extract a TClassDef from a Knex column-descriptor object:
 *
 * ```
 * registerSchema("User", {
 *   id:   { type: "integer", primaryKey: true },
 *   name: { type: "string", notNull: true, maxLength: 255 },
 * }, { orm: "knex" });
 * ```
 */
export function extractKnex(schema: unknown, name?: string): TClassDef {
    if (!looksLikeKnexDescriptor(schema)) {
        throw new SwaggiffyError(
            "Knex extractor expects a column descriptor object, e.g. " +
                '{ id: { type: "integer", primaryKey: true }, name: { type: "string", notNull: true, maxLength: 255 } }. ' +
                "Plain values like `{ id: 0, name: \"\" }` are not rich enough — they lose nullability and constraints.",
        );
    }

    const props: TClassProp[] = [];
    for (const [prop, desc] of Object.entries(schema as AnyRec)) {
        const mapped = mapSqlishType(desc.type);
        const notNull = desc.notNull === true || desc.required === true || desc.nullable === false || desc.primaryKey === true;
        const field: TClassProp = {
            prop,
            type: mapped.type,
            format: desc.format || mapped.format,
            required: notNull || undefined,
            nullable: notNull ? undefined : true,
            description: typeof desc.description === "string" ? desc.description : undefined,
        };

        const def = serializeDefault(desc.default ?? desc.defaultTo ?? desc.defaultValue);
        if (def !== undefined) field.default = def;

        const maxLength = unwrapConstraint(desc.maxLength ?? desc.length);
        const minLength = unwrapConstraint(desc.minLength);
        if (maxLength !== undefined) field.maxLength = maxLength;
        if (minLength !== undefined) field.minLength = minLength;

        const min = unwrapConstraint(desc.min ?? desc.minimum);
        const max = unwrapConstraint(desc.max ?? desc.maximum);
        if (min !== undefined) field.minimum = min;
        if (max !== undefined) field.maximum = max;

        if (Array.isArray(desc.enum) && desc.enum.length) field.enum = desc.enum;

        const refs = refFrom(desc);
        if (refs) {
            field.references = refs;
            if (!field.description) field.description = `Foreign key referencing ${refs}`;
        }

        props.push(field);
    }

    return toClassDef(name, props);
}
