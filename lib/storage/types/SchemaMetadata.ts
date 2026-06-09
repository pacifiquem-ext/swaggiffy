import { TSwaggerSchema } from "../../typings";

export interface SchemaMetadata {
    /**
     * Class which owns the schema
     */
    readonly target: unknown;

    /**
     * Name of Class owning the schema
     */
    readonly name: string;

    /**
     * Swagger Definition for the schema
     */
    readonly swaggerDefinition: TSwaggerSchema;
}
