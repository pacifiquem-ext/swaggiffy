"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchemaMetadataStorage = getSchemaMetadataStorage;
exports.getAPIDefinitionMetadataStorage = getAPIDefinitionMetadataStorage;
exports.getConfigMetadataStorage = getConfigMetadataStorage;
exports.setConfigMetadataStorage = setConfigMetadataStorage;
const PlatformTools_1 = require("./platform/PlatformTools");
const SchemaMetadataStorage_1 = require("./storage/SchemaMetadataStorage");
const APIDefinitionMetadataStorage_1 = require("./storage/APIDefinitionMetadataStorage");
const ConfigMetadataStorage_1 = require("./storage/ConfigMetadataStorage");
/**
 * Returns globals schemametadata storage
 */
function getSchemaMetadataStorage() {
    const globalScope = PlatformTools_1.PlatformTools.getGlobalVariable();
    if (!globalScope.schemaMetadataStorage)
        globalScope.schemaMetadataStorage = new SchemaMetadataStorage_1.SchemaMetadataStorage();
    return globalScope.schemaMetadataStorage;
}
/**
 * Returns globals schemametadata storage
 */
function getAPIDefinitionMetadataStorage() {
    const globalScope = PlatformTools_1.PlatformTools.getGlobalVariable();
    if (!globalScope.apiDefinitionStorage)
        globalScope.apiDefinitionStorage = new APIDefinitionMetadataStorage_1.APIDefinitionMetadataStorage();
    return globalScope.apiDefinitionStorage;
}
/**
 * Returns Config Metadata Storage
 */
function getConfigMetadataStorage() {
    const globalScope = PlatformTools_1.PlatformTools.getGlobalVariable();
    if (!globalScope.configMetadataStorage)
        globalScope.configMetadataStorage = new ConfigMetadataStorage_1.ConfigMetadataStorage();
    return globalScope.configMetadataStorage;
}
function setConfigMetadataStorage(config) {
    const storage = getConfigMetadataStorage();
    storage.appName = config.projectName;
    storage.format = config.format;
    storage.openApiVersion = config.openApiVersion;
    storage.swaggerDefinitionFilePath = config.outFile;
    storage.swaggerEndPointUrl = config.apiRoute;
}
