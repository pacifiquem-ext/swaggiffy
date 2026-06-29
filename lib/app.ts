import swaggerUi from "swagger-ui-express";
import { PathString } from "./typings";
import { ConfigMetadataStorage } from "./storage/ConfigMetadataStorage";
import { Runner } from "./runners/Runner";
import { SpecFile } from "./utils/SpecFile";

/**
 * Implicit Express Server.
 */
class App {
    private app: Express.Application;

    /**
     * Initialize and Setup the server.
     */
    public init(config: ConfigMetadataStorage): void {
        this.app = config.expressApplication;
        const resolved =
            config.relativePath === false
                ? config.swaggerDefinitionFilePath
                : process.cwd() + "/" + config.swaggerDefinitionFilePath.replace(/^\.\//, "");

        this.run(resolved, config.swaggerEndPointUrl);
    }

    /**
     * Serve the OpenAPI/Swagger document directly (no swagger-jsdoc).
     * Legacy swagger-jsdoc config files are unwrapped with a yellow deprecation warning.
     */
    public serveSwagger(swaggerDefinitionFile: string, swaggerEndPoint: PathString): void {
        try {
            const specs = SpecFile.load(swaggerDefinitionFile, { warnLegacy: true });
            this.app.use(swaggerEndPoint, swaggerUi.serve, swaggerUi.setup(specs as Record<string, unknown>));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[swaggiffy] Failed to load swagger file at ${swaggerDefinitionFile}: ${message}`);
        }
    }

    /**
     * Runs and executes swaggiffy
     */
    private async run(swaggerDefinitionFile: string, swaggerEndPoint: PathString) {
        Runner.execute();
        this.serveSwagger(swaggerDefinitionFile, swaggerEndPoint);
    }
}

export default App;
