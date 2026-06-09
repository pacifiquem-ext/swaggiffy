import { APIPathDefinition } from "../../typings";

export interface APIDefinitionMetadata {
    /**
     * Router which owns the API Definition
     */
    readonly router: unknown;

    /**
     * Swagger Definition for the schema
     */
    readonly apiDefinition: APIPathDefinition;
}
