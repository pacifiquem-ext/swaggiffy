import * as yaml from "js-yaml";
import { PlatformTools } from "../platform/PlatformTools";
import { TFormat } from "../typings";

/**
 * Helpers for reading, writing, and normalizing OpenAPI / Swagger documents on disk.
 */
export class SpecFile {
    /**
     * True when the document uses the legacy swagger-jsdoc config wrapper.
     */
    static isLegacyFormat(doc: Record<string, unknown>): boolean {
        return doc != null && typeof doc === "object" && Object.prototype.hasOwnProperty.call(doc, "swaggerDefinition");
    }

    /**
     * Emit a yellow deprecation warning for legacy swagger-jsdoc config files.
     */
    static warnLegacyFormat(): void {
        PlatformTools.logWarn(
            "[swaggiffy] DEPRECATION: Your swagger file uses the legacy swagger-jsdoc config format " +
                "(top-level \"swaggerDefinition\"). This format is deprecated.\n" +
                "  Delete the existing swagger file (or regenerate it) and restart your app so Swaggiffy " +
                "writes a valid OpenAPI document. Example: rm ./swagger/swagger.json",
        );
    }

    /**
     * Normalize a parsed document: unwrap legacy swaggerDefinition when present.
     * Returns the OpenAPI/Swagger document ready for swagger-ui or further updates.
     */
    static normalize(doc: Record<string, unknown>, options?: { warn?: boolean }): Record<string, unknown> {
        if (this.isLegacyFormat(doc)) {
            if (options?.warn !== false) this.warnLegacyFormat();
            return (doc.swaggerDefinition as Record<string, unknown>) || {};
        }
        return doc;
    }

    /**
     * Load a JSON or YAML swagger/OpenAPI file and return a normalized document.
     */
    static load(filePath: string, options?: { warnLegacy?: boolean }): Record<string, unknown> {
        const raw = PlatformTools.getFileContents(filePath).toString("utf8");
        let parsed: Record<string, unknown>;

        if (this.isYamlPath(filePath)) {
            parsed = (yaml.load(raw) as Record<string, unknown>) || {};
        } else {
            parsed = JSON.parse(raw) as Record<string, unknown>;
        }

        return this.normalize(parsed, { warn: options?.warnLegacy !== false });
    }

    /**
     * Serialize a document to JSON or YAML string based on format preference and/or file path.
     */
    static serialize(doc: Record<string, unknown>, format: TFormat, filePath?: string): string {
        const useYaml = format === "yaml" || (filePath != null && this.isYamlPath(filePath));
        if (useYaml) {
            return yaml.dump(doc, { noRefs: true, lineWidth: 120, sortKeys: false });
        }
        return JSON.stringify(doc, null, 2);
    }

    /**
     * Write a document to disk in the configured format.
     */
    static write(filePath: string, doc: Record<string, unknown>, format: TFormat): void {
        PlatformTools.writeToFile(filePath, this.serialize(doc, format, filePath));
    }

    /**
     * Whether the path looks like a YAML file.
     */
    static isYamlPath(filePath: string): boolean {
        return /\.ya?ml$/i.test(filePath);
    }

    /**
     * True when the document is OpenAPI v3 (openapi field present).
     */
    static isOpenApiV3(doc: Record<string, unknown>): boolean {
        return typeof doc.openapi === "string" && doc.openapi.startsWith("3.");
    }
}
