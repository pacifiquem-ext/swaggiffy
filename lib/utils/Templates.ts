import { PlatformTools } from "../platform/PlatformTools";
import { TemplateOptions } from "../typings";
import { Defaults } from "./Defaults";

/**
 * Swaggiffy Templates class — emits valid OpenAPI / Swagger documents (no swagger-jsdoc wrapper).
 */
export class Templates {
    /**
     * Returns swaggiffy config file template
     */
    static getConfigTemplate(options?: TemplateOptions): string {
        return JSON.stringify(
            {
                projectName: options?.projectName || PlatformTools.getProjectName(),
                openApiVersion: options?.openApiVersion || Defaults.OPENAPI_VERSION,
                outFile: options?.outFile || Defaults.SWAGGER_DEFINITION_FILE,
                apiRoute: options?.apiRouteUrl || Defaults.SWAGGER_ENDPOINT_URL,
                format: options?.format || Defaults.SWAGGER_DEFINITION_FORMAT,
            },
            undefined,
            3,
        );
    }

    /**
     * Valid Swagger 2.0 document template (written directly to outFile).
     */
    static getOSA2Template(projectName?: string, port?: number): string {
        const name: string = projectName ? projectName : PlatformTools.getProjectName();
        return JSON.stringify(
            {
                swagger: "2.0",
                info: {
                    title: name,
                    description: `${name} API Documentation`,
                    termsOfService: "http://swagger.io/terms/",
                    contact: {
                        name: "API Support",
                        url: "http://www.swagger.io/support",
                        email: "support@swagger.io",
                    },
                    license: {
                        name: "Apache 2.0",
                        url: "http://www.apache.org/licenses/LICENSE-2.0.html",
                    },
                    version: "1.0.0",
                },
                host: `localhost:${port || Defaults.APP_PORT}`,
                basePath: "/",
                schemes: ["http"],
                securityDefinitions: {
                    Bearer: {
                        type: "apiKey",
                        name: "Authorization",
                        in: "header",
                    },
                },
                paths: {},
                definitions: {},
            },
            undefined,
            2,
        );
    }

    /**
     * Valid OpenAPI 3.0 document template (written directly to outFile).
     */
    static getOSA3Template(projectName?: string, port?: number): string {
        const name: string = projectName ? projectName : PlatformTools.getProjectName();
        return JSON.stringify(
            {
                openapi: "3.0.0",
                info: {
                    title: name,
                    description: `${name} API Documentation`,
                    termsOfService: "http://swagger.io/terms/",
                    contact: {
                        name: "API Support",
                        url: "http://www.swagger.io/support",
                        email: "support@swagger.io",
                    },
                    license: {
                        name: "Apache 2.0",
                        url: "http://www.apache.org/licenses/LICENSE-2.0.html",
                    },
                    version: "1.0.0",
                },
                servers: [
                    {
                        url: `http://localhost:${port || Defaults.APP_PORT}`,
                    },
                ],
                paths: {},
                components: {
                    schemas: {},
                    securitySchemes: {
                        bearerAuth: {
                            type: "http",
                            scheme: "bearer",
                            bearerFormat: "JWT",
                        },
                    },
                },
            },
            undefined,
            2,
        );
    }
}
