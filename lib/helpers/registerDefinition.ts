import { APIDefinitionOptions, APIDocResponse, APIParameters, APIPathDefinition } from "../typings";
import { getAPIDefinitionMetadataStorage } from "../globals";
import { APIDefinitionMetadata } from "../storage/types/APIDefinitionMetadata";

interface RouterLike {
    stack: any[];
}

/**
 * Create swagger path definition from an Express router.
 * Path parameters are inferred from route keys; query/header/cookie/formData
 * come from APIDefinitionOptions.parameters. Security is only applied when
 * explicitly passed in options.
 */
export function registerDefinition(router: RouterLike, options: APIDefinitionOptions) {
    const paths = router.stack.filter((item) => item.route);
    paths.forEach((item) => {
        const method = item.route.stack[0].method.toLowerCase();
        const path = item.route.path;

        const parameters: APIParameters[] = [];
        let responses: APIDocResponse = {};

        if (item.keys && item.keys.length > 0) {
            for (const key of item.keys) {
                parameters.push({
                    in: "path",
                    name: key.name,
                    required: true,
                    type: "string",
                });
            }
        }

        // User-declared parameters (query, header, cookie, formData, etc.)
        if (options.parameters && options.parameters.length > 0) {
            for (const param of options.parameters) {
                parameters.push({ ...param });
            }
        }

        // Intermediate body representation (converted to requestBody for OpenAPI 3 in Utility)
        if (method === "post" || method === "put" || method === "patch") {
            parameters.push({
                in: "body",
                name: "body",
                required: method === "post",
                schema: {
                    $ref: `#/definitions/${options.mappedSchema}`,
                },
            });
        }

        if (options.responses) {
            responses = options.responses;
        } else if (method === "delete") {
            responses = {
                "200": {
                    description: "OK",
                    schema: {
                        type: "object",
                        properties: {
                            deleted: {
                                type: "boolean",
                                example: true,
                            },
                        },
                    },
                },
                "500": {
                    description: "Internal Server Error",
                },
            };
        } else if (method === "post" || method === "put" || method === "patch") {
            responses = {
                "201": {
                    description: "Created",
                    schema: {
                        $ref: `#/definitions/${options.mappedSchema}`,
                    },
                },
                "500": {
                    description: "Internal Server Error",
                },
            };
        } else {
            responses = {
                "200": {
                    description: "OK",
                    schema: {
                        type: "array",
                        items: {
                            $ref: `#/definitions/${options.mappedSchema}`,
                        },
                    },
                },
                "500": {
                    description: "Internal Server Error",
                    schema: {
                        type: "object",
                        properties: {
                            error: {
                                type: "string",
                                example: "Internal Server Error",
                            },
                        },
                    },
                },
            };
        }

        const pathDefinition: APIPathDefinition = {
            pathString: `${options.basePath}${path}`,
            tags: options.tags?.split(" ") || [],
            method: method as APIPathDefinition["method"],
            meta: {
                summary: options.summary || "",
                description: options.description || "",
                parameters: parameters,
                produces: options.produces || ["application/json"],
                consumes: options.consumes || ["application/json"],
                responses,
                ...(options.security ? { security: options.security } : {}),
            },
        };

        getAPIDefinitionMetadataStorage().apiDefinitions.push({
            router,
            apiDefinition: pathDefinition,
        } as APIDefinitionMetadata);
    });
}

export type DefinitionParam = {
    router: RouterLike;
    options: APIDefinitionOptions;
};

/**
 * Register several routers in one call.
 */
export function registerDefinitions(definitions: DefinitionParam[]) {
    for (const item of definitions) {
        registerDefinition(item.router, item.options);
    }
}
