import mongoose from "mongoose";
import { SchemaRegistryObj, TClassDef, TClassProps } from "../typings";
import { Utility } from "../utils/Utility";
import { extractMongoose } from "./mongoose.extractor";
import { extractSequelize } from "./sequelize.extractor";
import { extractDrizzle } from "./drizzle.extractor";
import { extractTypeORM } from "./typeorm.extractor";
import { extractPrisma } from "./prisma.extractor";
import { extractKnex } from "./knex.extractor";
import { extractObjection } from "./objection.extractor";

/**
 * Schema Extractor facade.
 * Plain / class helpers live here; ORM-specific work is delegated to dedicated extractors.
 */
export class SchemaExtractor {
    /**
     * Extract props from a plain object (lossy: type only, no nullability / constraints).
     */
    static extractPlain(schema: SchemaRegistryObj, name?: string): TClassDef {
        const props: TClassProps = [];
        for (const prop of Object.keys(schema)) {
            const [propType, propFormat] = Utility.castJSType(typeof schema[prop]);
            props.push({
                prop,
                type: propType,
                required: undefined,
                description: undefined,
                example: undefined,
                format: propFormat,
            });
        }

        return { name: name || "Schema", props };
    }

    static extractMongoose(schema: mongoose.Schema | mongoose.Model<unknown>, name?: string): TClassDef {
        return extractMongoose(schema, name);
    }

    static extractSequelize(schema: unknown, name?: string): TClassDef {
        return extractSequelize(schema, name);
    }

    static extractDrizzle(schema: unknown, name?: string): TClassDef {
        return extractDrizzle(schema, name);
    }

    static extractTypeORM(schema: unknown, name?: string): TClassDef {
        return extractTypeORM(schema, name);
    }

    static extractPrisma(schema: unknown, name?: string): TClassDef {
        return extractPrisma(schema, name);
    }

    static extractKnex(schema: unknown, name?: string): TClassDef {
        return extractKnex(schema, name);
    }

    static extractObjection(schema: unknown, name?: string): TClassDef {
        return extractObjection(schema, name);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static extractClassProps(target: any, name?: string): TClassDef {
        const instance: Record<string, unknown> = new target() as Record<string, unknown>;
        const props: TClassProps = [];
        for (const prop of Object.keys(instance)) {
            const [propType, propFormat] = Utility.castJSType(typeof instance[prop]);
            props.push({
                prop,
                type: propType,
                required: undefined,
                description: undefined,
                example: undefined,
                format: propFormat,
            });
        }
        return { name: name || target.name, props };
    }
}
