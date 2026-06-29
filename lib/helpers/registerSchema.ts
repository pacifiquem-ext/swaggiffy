import { SchemaRegistryObj, SchemaRegistryOptions, SchemaRegistryType, TClassDef, TSwaggerSchema } from "../typings";
import { getSchemaMetadataStorage } from "../globals";
import { Utility } from "../utils/Utility";
import * as mongoose from "mongoose";
import { SwaggiffyError } from "../errors/SwaggiffyError";
import { SchemaExtractor } from "../extractors/schema.extractor";
import { SchemaMetadata } from "../storage/types/SchemaMetadata";
import { PlatformTools } from "../platform/PlatformTools";

/**
 * Create swagger schema definition
 */

export type SchemaParam = {
    name: string;
    schema: SchemaRegistryType;
    options?: SchemaRegistryOptions;
};

const SUPPORTED_ORMS = new Set(["mongoose", "sequelize", "prisma", "typeorm", "knex", "objection", "drizzle"]);

/**
 * Resolve a schema into a TClassDef using ORM-aware extractors when available.
 * Full extractors for typeorm/prisma/knex/objection/drizzle land in Workstream 2;
 * until then those ORMs fall back to plain/class extraction with a warning.
 */
function extractSchema(name: string, schema: SchemaRegistryType, options?: SchemaRegistryOptions): TClassDef {
    if (options?.orm) {
        if (!SUPPORTED_ORMS.has(options.orm)) {
            throw new SwaggiffyError(`Orm "${options.orm}" is not supported. Supported: ${Array.from(SUPPORTED_ORMS).join(", ")}`);
        }

        if (options.orm === "mongoose") {
            return SchemaExtractor.extractMongoose(schema as mongoose.Schema, name);
        }
        if (options.orm === "sequelize") {
            return SchemaExtractor.extractSequelize(schema, name);
        }

        // Interim fallback for ORMs pending Workstream 2 extractors
        PlatformTools.logWarn(
            `[swaggiffy] ORM "${options.orm}" is accepted but full schema extraction is not implemented yet; using plain object inspection.`,
        );
        if (typeof schema === "function") {
            return SchemaExtractor.extractClassProps(schema as new () => unknown, name);
        }
        return SchemaExtractor.extractPlain(schema as SchemaRegistryObj, name);
    }

    if (schema instanceof mongoose.Schema) {
        return SchemaExtractor.extractMongoose(schema as mongoose.Schema, name);
    }

    PlatformTools.logWarn(
        `[swaggiffy] registerSchema("${name}") was called without an { orm } option. ` +
            "Plain object inspection is lossy; pass { orm: 'mongoose' | 'sequelize' | ... } for richer schemas.",
    );

    if (typeof schema === "function") {
        return SchemaExtractor.extractClassProps(schema as new () => unknown, name);
    }
    return SchemaExtractor.extractPlain(schema as SchemaRegistryObj, name);
}

export function registerSchema(name: string, schema: SchemaRegistryType, options?: SchemaRegistryOptions) {
    const extractor = extractSchema(name, schema, options);
    const swaggerDefinition: TSwaggerSchema = Utility.genSchemaDef(extractor);

    getSchemaMetadataStorage().schemas.push({
        target: extractor,
        name: name,
        swaggerDefinition,
    } as SchemaMetadata);
}

export function registerSchemas(schemas: SchemaParam[]) {
    for (const _schema of schemas) {
        registerSchema(_schema.name, _schema.schema, _schema.options);
    }
}
