import mongoose from "mongoose";
import { TClassDef, TClassProp } from "../typings";
import { Utility } from "../utils/Utility";
import { normalizeEnum, serializeDefault, toClassDef, unwrapConstraint } from "./orm.helpers";

function unwrapMongooseSchema(schema: unknown): mongoose.Schema {
    const s = schema as { paths?: unknown; schema?: mongoose.Schema };
    if (s && s.paths) return schema as mongoose.Schema;
    if (s && s.schema && (s.schema as { paths?: unknown }).paths) return s.schema;
    return schema as mongoose.Schema;
}

function isPathRequired(path: mongoose.SchemaType): boolean {
    const anyPath = path as mongoose.SchemaType & { isRequired?: unknown; options?: { required?: unknown } };
    if (anyPath.isRequired === true) return true;
    const req = anyPath.options?.required;
    return req === true;
}

/**
 * Extract a TClassDef from a Mongoose Schema or Model, including
 * required, default, min/max, minlength/maxlength, enum, and refs.
 */
export function extractMongoose(schema: mongoose.Schema | mongoose.Model<unknown>, name?: string): TClassDef {
    const mongooseSchema = unwrapMongooseSchema(schema);
    const props: TClassProp[] = [];
    const paths = (mongooseSchema.paths || {}) as Record<string, mongoose.SchemaType>;

    for (const prop of Object.keys(paths)) {
        const path = paths[prop] as mongoose.SchemaType & {
            instance?: string;
            options?: Record<string, unknown>;
            enumValues?: unknown[];
            caster?: { instance?: string };
        };
        const instance = path.instance || "Mixed";
        const [propType, propFormat, , example] = Utility.castMongooseType(instance);
        const options = path.options || {};

        const field: TClassProp = {
            prop,
            type: propType,
            format: propFormat,
            example,
            required: isPathRequired(path) || undefined,
            description: typeof options.description === "string" ? options.description : undefined,
        };

        const def = serializeDefault(options.default);
        if (def !== undefined) field.default = def;

        const minLength = unwrapConstraint(options.minlength ?? options.minLength);
        const maxLength = unwrapConstraint(options.maxlength ?? options.maxLength);
        if (minLength !== undefined) field.minLength = minLength;
        if (maxLength !== undefined) field.maxLength = maxLength;

        const min = unwrapConstraint(options.min);
        const max = unwrapConstraint(options.max);
        if (min !== undefined) field.minimum = min;
        if (max !== undefined) field.maximum = max;

        const enumVals = normalizeEnum(options.enum ?? path.enumValues);
        if (enumVals) field.enum = enumVals;

        if (typeof options.ref === "string" && options.ref) {
            field.references = options.ref;
            if (!field.description) field.description = `Reference to ${options.ref}`;
        }

        if (instance === "Array" && path.caster?.instance) {
            const [itemType, itemFormat] = Utility.castMongooseType(path.caster.instance);
            field.items = { type: itemType, ...(itemFormat ? { format: itemFormat } : {}) };
        }

        if (!field.required) field.nullable = true;

        props.push(field);
    }

    return toClassDef(name, props);
}
