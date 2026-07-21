import { SchemaMetadata } from "../storage/types/SchemaMetadata";
import {
    APIParameters,
    SwaggerAPIDefinition,
    TClassDef,
    TSchemaProp,
    TSwaggerDataType,
    TSwaggerNumberFormats,
    TSwaggerSchema,
    TSwaggerSchemaDef,
    TSwaggerStringFormats,
} from "../typings";
import { ConfigMetadataStorage } from "../storage/ConfigMetadataStorage";
import { getConfigMetadataStorage } from "../globals";
import { APIDefinitionMetadata } from "../storage/types/APIDefinitionMetadata";
import mongoose from "mongoose";
import { ValidationUtils } from "./ValidationUtils";
import { SpecFile } from "./SpecFile";

export class Utility {
    static configStore: ConfigMetadataStorage = getConfigMetadataStorage();

    /**
     * Generate Swagger Schema Definition
     */
    static genSchemaDef(obj: TClassDef): TSwaggerSchema {
        const properties: TSchemaProp = {};
        const required: string[] = [];

        for (const prop of obj.props) {
            const schemaObj: TSchemaProp[string] = { type: prop.type };
            if (prop.format !== undefined) schemaObj.format = prop.format;
            if (prop.example !== undefined) schemaObj.example = prop.example;
            if (prop.description !== undefined) schemaObj.description = prop.description;
            if (prop.default !== undefined) schemaObj.default = prop.default;
            if (prop.maxLength !== undefined) schemaObj.maxLength = prop.maxLength;
            if (prop.minLength !== undefined) schemaObj.minLength = prop.minLength;
            if (prop.minimum !== undefined) schemaObj.minimum = prop.minimum;
            if (prop.maximum !== undefined) schemaObj.maximum = prop.maximum;
            if (prop.enum !== undefined) schemaObj.enum = prop.enum;
            if (prop.nullable) schemaObj.nullable = true;
            if (prop.items) schemaObj.items = prop.items;
            if (prop.references) {
                schemaObj["x-references"] = prop.references;
                if (schemaObj.description === undefined) {
                    schemaObj.description = `Foreign key referencing ${prop.references}`;
                }
            }

            properties[prop.prop] = schemaObj;
            if (prop.required) required.push(prop.prop);
        }

        return {
            [obj.name]: {
                type: "object",
                properties,
                ...(required.length > 0 ? { required } : {}),
            },
        };
    }

    /**
     * Apply schema definitions onto a valid OpenAPI/Swagger document.
     * Uses components.schemas for v3 and definitions for v2.
     */
    static applySchemas(doc: Record<string, unknown>, schema: TSwaggerSchemaDef): Record<string, unknown> {
        if (SpecFile.isOpenApiV3(doc) || Utility.isOpenApiV3Config()) {
            const components = (doc.components as Record<string, unknown>) || {};
            components.schemas = schema;
            doc.components = components;
            // Ensure we are not leaving a legacy wrapper behind
            delete doc.swaggerDefinition;
            delete doc.apis;
            if (!doc.openapi) doc.openapi = "3.0.0";
            delete doc.swagger;
            delete doc.definitions;
        } else {
            doc.definitions = schema;
            delete doc.swaggerDefinition;
            delete doc.apis;
            if (!doc.swagger) doc.swagger = "2.0";
            delete doc.openapi;
        }
        return doc;
    }

    /**
     * Apply path definitions onto a valid OpenAPI/Swagger document.
     */
    static applyPaths(doc: Record<string, unknown>, apiDefinition: SwaggerAPIDefinition): Record<string, unknown> {
        doc.paths = apiDefinition;
        delete doc.swaggerDefinition;
        delete doc.apis;
        return doc;
    }

    private static isOpenApiV3Config(): boolean {
        const v = Utility.configStore.openApiVersion;
        return typeof v === "string" && v.includes("3.");
    }

    private static resolveFilePath(): string {
        const path = Utility.configStore.swaggerDefinitionFilePath;
        if (Utility.configStore.relativePath !== false && !path.startsWith("/")) {
            return process.cwd() + "/" + path;
        }
        return path;
    }

    /**
     * Write schemas or API definitions into the on-disk OpenAPI document.
     */
    static async swaggiffy(schema: TSwaggerSchemaDef | SwaggerAPIDefinition, type: "DEFINITION" | "SCHEMA") {
        return new Promise<void>((ok) => {
            const filePath = Utility.resolveFilePath();
            // Load without warning on the generation path — warning is emitted when serving
            const doc = SpecFile.load(filePath, { warnLegacy: false });

            if (type === "SCHEMA") {
                Utility.applySchemas(doc, schema as TSwaggerSchemaDef);
            } else {
                Utility.applyPaths(doc, schema as SwaggerAPIDefinition);
            }

            SpecFile.write(filePath, doc, Utility.configStore.format || "json");
            ok();
        });
    }

    /**
     * Converts SchemaMetadata[] to plain JSON Object
     */
    static toSwaggerSchema(array: SchemaMetadata[]): TSwaggerSchemaDef {
        let definition: TSwaggerSchemaDef = <TSwaggerSchemaDef>{};

        for (const item of array) {
            definition = {
                ...definition,
                ...{ [item.name]: item.swaggerDefinition[item.name] },
            };
        }

        return definition;
    }

    /**
     * Rewrite legacy `#/definitions/Name` refs to OpenAPI 3 components when needed.
     */
    private static rewriteRef(ref: string | undefined, isV3: boolean): string | undefined {
        if (!ref) return ref;
        if (isV3 && ref.startsWith("#/definitions/")) {
            return ref.replace("#/definitions/", "#/components/schemas/");
        }
        if (!isV3 && ref.startsWith("#/components/schemas/")) {
            return ref.replace("#/components/schemas/", "#/definitions/");
        }
        return ref;
    }

    private static rewriteResponseSchemas(responses: Record<string, any>, isV3: boolean): Record<string, any> {
        const out: Record<string, any> = {};
        for (const [code, resp] of Object.entries(responses || {})) {
            const next = { ...resp };
            if (next.schema) {
                if (next.schema.$ref) {
                    next.schema = { ...next.schema, $ref: Utility.rewriteRef(next.schema.$ref, isV3) };
                }
                if (next.schema.items?.$ref) {
                    next.schema = {
                        ...next.schema,
                        items: { ...next.schema.items, $ref: Utility.rewriteRef(next.schema.items.$ref, isV3) },
                    };
                }
                if (isV3) {
                    // OpenAPI 3 uses content instead of schema on responses
                    const media = "application/json";
                    next.content = {
                        [media]: {
                            schema: next.schema,
                        },
                    };
                    delete next.schema;
                }
            }
            out[code] = next;
        }
        return out;
    }

    /**
     * Build an operation object for OpenAPI 3 or Swagger 2 from stored metadata.
     */
    private static buildOperation(meta: APIDefinitionMetadata["apiDefinition"]["meta"], tags: string[], isV3: boolean): Record<string, unknown> {
        const parameters: APIParameters[] = [...(meta.parameters || [])];
        const bodyParams = parameters.filter((p) => p.in === "body");
        const formParams = parameters.filter((p) => p.in === "formData");
        const otherParams = parameters.filter((p) => p.in !== "body" && p.in !== "formData");

        const mappedParams = otherParams.map((p) => {
            if (isV3) {
                // OpenAPI 3: type lives under schema
                const { type, format, ...rest } = p;
                const param: Record<string, unknown> = { ...rest };
                if (type) {
                    param.schema = { type, ...(format ? { format } : {}) };
                } else if (p.schema) {
                    param.schema = { ...p.schema };
                    if (p.schema.$ref) {
                        (param.schema as { $ref?: string }).$ref = Utility.rewriteRef(p.schema.$ref, true);
                    }
                }
                return param;
            }
            // Swagger 2: cookie not supported — map to header for compatibility
            const param = { ...p };
            if (param.in === "cookie") {
                param.in = "header";
            }
            if (param.schema?.$ref) {
                param.schema = { ...param.schema, $ref: Utility.rewriteRef(param.schema.$ref, false) };
            }
            return param;
        });

        // Swagger 2 keeps formData as parameters
        const v2FormParams = !isV3
            ? formParams.map((p) => ({
                  in: "formData" as const,
                  name: p.name,
                  type: p.type || "string",
                  required: p.required,
                  description: p.description,
                  format: p.format,
              }))
            : [];

        const operation: Record<string, unknown> = {
            tags,
            summary: meta.summary,
            description: meta.description,
            parameters: isV3 ? mappedParams : [...mappedParams, ...v2FormParams],
            responses: Utility.rewriteResponseSchemas(meta.responses as any, isV3),
        };

        if (meta.operationId) operation.operationId = meta.operationId;

        if (meta.security) {
            operation.security = meta.security;
        }

        const consumes = meta.consumes || ["application/json"];
        const primaryConsume = consumes[0] || "application/json";

        if (isV3 && formParams.length > 0) {
            const formMedia = consumes.find((c) => c.includes("multipart") || c.includes("urlencoded")) || "multipart/form-data";
            const properties: Record<string, Record<string, unknown>> = {};
            const required: string[] = [];
            for (const fp of formParams) {
                properties[fp.name] = { type: fp.type || "string", ...(fp.format ? { format: fp.format } : {}), ...(fp.description ? { description: fp.description } : {}) };
                if (fp.required) required.push(fp.name);
            }
            operation.requestBody = {
                required: required.length > 0,
                content: {
                    [formMedia]: {
                        schema: {
                            type: "object",
                            properties,
                            ...(required.length ? { required } : {}),
                        },
                    },
                },
            };
        }

        if (bodyParams.length > 0) {
            const body = bodyParams[0];
            const ref = Utility.rewriteRef(body.schema?.$ref, isV3) || body.schema?.$ref;

            if (isV3) {
                const existing = (operation.requestBody as { content?: Record<string, unknown> } | undefined)?.content || {};
                const formOwnsPrimary =
                    formParams.length > 0 && (primaryConsume.includes("multipart") || primaryConsume.includes("urlencoded"));
                const jsonKey = formOwnsPrimary ? "application/json" : primaryConsume;
                // When the user declared form fields and a form consume type, do not
                // clobber that media type with the automatic mappedSchema $ref.
                operation.requestBody = {
                    required: body.required !== false,
                    content: formOwnsPrimary
                        ? existing
                        : {
                              ...existing,
                              [jsonKey]: {
                                  schema: ref ? { $ref: ref } : { type: body.type || "object" },
                              },
                          },
                };
            } else {
                operation.parameters = [
                    ...((operation.parameters as unknown[]) || []),
                    {
                        in: "body",
                        name: body.name || "body",
                        required: body.required !== false,
                        schema: ref ? { $ref: ref } : { type: body.type || "object" },
                    },
                ];
                operation.consumes = consumes;
                operation.produces = meta.produces || ["application/json"];
            }
        } else if (!isV3) {
            operation.consumes = meta.consumes || ["application/json"];
            operation.produces = meta.produces || ["application/json"];
        }

        return operation;
    }

    /**
     * Converts APIDefinitionMetadata[] to a paths object for the active OpenAPI version.
     */
    static toSwaggerAPIDefinition(array: APIDefinitionMetadata[]): SwaggerAPIDefinition {
        let apiDefinition: SwaggerAPIDefinition = <SwaggerAPIDefinition>{};
        const isV3 = Utility.isOpenApiV3Config();

        const pathStrings: string[] = array.map((item) => item.apiDefinition.pathString);
        const uniquePathStrings: string[] = Array.from(new Set(pathStrings));

        for (const pathString of uniquePathStrings) {
            const methods = array.filter((item) => item.apiDefinition.pathString === pathString);
            let apiDefinerObj: Record<string, unknown> = {};
            for (const method of methods) {
                apiDefinerObj = {
                    ...apiDefinerObj,
                    [method.apiDefinition.method]: Utility.buildOperation(
                        method.apiDefinition.meta,
                        method.apiDefinition.tags,
                        isV3,
                    ),
                };
            }

            apiDefinition = {
                ...apiDefinition,
                ...{
                    [ValidationUtils.cleanSwaggerPathString(pathString)]: {
                        ...apiDefinerObj,
                    },
                },
            } as SwaggerAPIDefinition;
        }

        return apiDefinition;
    }


    static extractType(func: (...args: unknown[]) => unknown) {
        const str = func.toString();

        if (str.toLowerCase().includes("string")) return "string";
        else if (str.toLowerCase().includes("number")) return "number";
        else if (str.toLowerCase().includes("boolean")) return "boolean";
        else if (str.toLowerCase().includes("date")) return "string";
        else if (str.toLowerCase().includes("objectid")) return "string";
        else if (str.toLowerCase().includes("uuid")) return "string";
    }

    static castMongooseType(
        type: string,
    ): [TSwaggerDataType, TSwaggerStringFormats | TSwaggerNumberFormats | undefined, boolean | undefined, string | number | boolean | undefined] {
        switch (type) {
            case mongoose.Schema.Types.String.schemaName:
                return ["string", undefined, undefined, "string"];
            case mongoose.Schema.Types.Number.schemaName:
                return ["number", undefined, undefined, 0];
            case mongoose.Schema.Types.Date.schemaName:
                return ["string", "date", undefined, new Date().toLocaleString()];
            case mongoose.Schema.Types.Boolean.schemaName:
                return ["boolean", undefined, undefined, false];
            case mongoose.Schema.Types.Buffer.schemaName:
                return ["object", undefined, undefined, undefined];
            case mongoose.Schema.Types.Mixed.schemaName:
                return ["object", undefined, undefined, undefined];
            case "ObjectID":
                return ["string", undefined, true, "507f1f77bcf86cd799439011"];
            case mongoose.Schema.Types.Array.schemaName:
                return ["array", undefined, undefined, undefined];
            case mongoose.Schema.Types.Map.schemaName:
                return ["object", undefined, undefined, undefined];
            default:
                return ["object", undefined, undefined, undefined];
        }
    }

    static castSequelizeType(
        type: string,
    ): [TSwaggerDataType, TSwaggerStringFormats | TSwaggerNumberFormats | undefined, boolean | undefined, string | number | boolean | undefined] {
        switch (type) {
            case "STRING":
                return ["string", undefined, undefined, "string"];
            case "TEXT":
                return ["string", undefined, undefined, "string"];
            case "CITEXT":
                return ["string", undefined, undefined, "string"];
            case "DATE":
                return ["string", "date-time", undefined, new Date().toISOString()];
            case "DATEONLY":
                return ["string", "date", undefined, new Date().toISOString().slice(0, 10)];
            case "UUID":
                return ["string", "uuid", undefined, "78a208e0-01fc-4cc0-b533-de8c076a6bf8"];
            case "UUIDV4":
                return ["string", "uuid", undefined, "78a208e0-01fc-4cc0-b533-de8c076a6bf8"];
            case "BOOLEAN":
                return ["boolean", undefined, undefined, false];
            case "FLOAT":
                return ["number", "float", undefined, 0.0];
            case "DOUBLE":
                return ["number", "double", undefined, 0.0];
            case "BIGINT":
                return ["integer", "int64", undefined, 0];
            case "DECIMAL":
                return ["number", "double", undefined, 0.0];
            case "INTEGER":
                return ["integer", "int32", undefined, 0];
            default:
                return ["object", undefined, undefined, undefined];
        }
    }

    static castJSType(type: string): [TSwaggerDataType, TSwaggerStringFormats | TSwaggerNumberFormats | undefined] {
        switch (type) {
            case "string":
                return ["string", undefined];

            case "number":
                return ["number", undefined];

            case "bigint":
                return ["number", undefined];

            case "boolean":
                return ["boolean", undefined];

            case "symbol":
                return ["object", undefined];

            case "undefined":
                return ["object", undefined];

            case "object":
                return ["object", undefined];

            case "function":
                return ["object", undefined];

            default:
                return ["object", undefined];
        }
    }
}
