import { getAPIDefinitionMetadataStorage, getSchemaMetadataStorage } from "../globals";
import { Utility } from "../utils/Utility";
import { SwaggerAPIDefinition, TSwaggerSchemaDef } from "../typings";
import { PlatformTools } from "../platform/PlatformTools";

/**
 * Runner Class
 */
export class Runner {
    /**
     * Generating schemas from global SchemaMetadataStorage
     * @param schemas
     */
    static generateSchemas(): void {
        const swaggerSchemaDefinition: TSwaggerSchemaDef = Utility.toSwaggerSchema(getSchemaMetadataStorage().schemas);
        Utility.swaggiffy(swaggerSchemaDefinition, "SCHEMA");
        PlatformTools.logSuccess("Swagger Schemas generated successfully");
    }

    /**
     * Generating apiDefinitions from global APIDefinitionMetadataStorage
     * @param schemas
     */
    static generateAPIDefinitions(): void {
        const pathDefinition: SwaggerAPIDefinition = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        Utility.swaggiffy(pathDefinition, "DEFINITION");
        PlatformTools.logSuccess("Swagger API Definitions generated successfully");
    }

    static execute(): void {
        this.generateSchemas();
        this.generateAPIDefinitions();
    }
}
