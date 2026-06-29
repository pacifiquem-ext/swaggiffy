import { setConfigMetadataStorage } from "../globals";
import { ConfigurationProps } from "../typings";
import { Defaults } from "../utils/Defaults";
import { FileUtils } from "../utils/FileUtils";
import { Templates } from "../utils/Templates";
import { SetupRunner } from "./SetupRunner";

/**
 * Swaggiffy Initialization Runner
 */
export class InitRunner {
    /**
     * Extract Configurations from Swaggiffy config file
     * @returns Promise<ConfigurationProps>
     */
    static async extractConfigurations(): Promise<ConfigurationProps> {
        return new Promise<ConfigurationProps>(async (ok, fail) => {
            const configFile: string = process.cwd() + "/" + FileUtils.cleanPath(Defaults.SWAGGIFY_CONFIG_FILE);
            let configuration: ConfigurationProps | boolean = JSON.parse(
                await FileUtils.getFileContents(configFile, { type: "Configuration", throwable: false }).toString(),
            ) as ConfigurationProps | boolean;
            if (typeof configuration === "boolean") {
                await SetupRunner.generateConfigFile(Templates.getConfigTemplate());
                configuration = JSON.parse(await FileUtils.getFileContents(configFile).toString()) as ConfigurationProps;
            }
            ok(configuration);
        });
    }
    /**
     * Caches Global Configurations.
     * @returns Promise<void>
     */
    static async cacheGlobalConfigurations(): Promise<void> {
        return new Promise<void>(async (ok, fail) => {
            const config: ConfigurationProps = await this.extractConfigurations();

            if (!FileUtils.fileOrDirectoryExists(config.outFile)) {
                let template: string;
                if (config.openApiVersion.includes("2.")) template = Templates.getOSA2Template(config.projectName);
                else template = Templates.getOSA3Template(config.projectName);

                // Write YAML when format is yaml
                if (config.format === "yaml") {
                    const { SpecFile } = await import("../utils/SpecFile");
                    const doc = JSON.parse(template) as Record<string, unknown>;
                    const path = config.outFile.startsWith("/") ? config.outFile : process.cwd() + "/" + config.outFile.replace(/^\.\//, "");
                    const { FileUtils: FU } = await import("../utils/FileUtils");
                    await FU.createFileInWorkspace(config.outFile, true);
                    SpecFile.write(path, doc, "yaml");
                } else {
                    await SetupRunner.generateSpecFile(template, config.outFile);
                }
            }

            setConfigMetadataStorage(config);
            ok();
        });
    }
}
