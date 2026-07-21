import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as yaml from "js-yaml";
import { Utility } from "../../lib/utils/Utility";
import { SpecFile } from "../../lib/utils/SpecFile";
import { getConfigMetadataStorage, getAPIDefinitionMetadataStorage, getSchemaMetadataStorage } from "../../lib/globals";
import { registerDefinition } from "../../lib/helpers/registerDefinition";
import { registerSchema } from "../../lib/helpers/registerSchema";
import { Runner } from "../../lib/runners/Runner";
import { Templates } from "../../lib/utils/Templates";

function clearStorages() {
    (getAPIDefinitionMetadataStorage().apiDefinitions as unknown[]).splice(0);
    (getSchemaMetadataStorage().schemas as unknown[]).splice(0);
}

function makeRouter(routes: Array<{ method: string; path: string; keys?: Array<{ name: string }> }>) {
    return {
        stack: routes.map((r) => ({
            route: {
                path: r.path,
                stack: [{ method: r.method }],
            },
            keys: r.keys || [],
        })),
    };
}

function setupConfig(tmpDir: string, opts: { openApiVersion: "2.0" | "3.0"; format: "json" | "yaml"; outFile?: string }) {
    const outFile = opts.outFile || (opts.format === "yaml" ? "./swagger.yaml" : "./swagger.json");
    const absOut = path.join(tmpDir, outFile.replace(/^\.\//, ""));
    fs.mkdirSync(path.dirname(absOut), { recursive: true });

    const template = opts.openApiVersion.includes("3.")
        ? Templates.getOSA3Template("Test API")
        : Templates.getOSA2Template("Test API");
    fs.writeFileSync(absOut, template);

    const storage = getConfigMetadataStorage();
    storage.appName = "Test API";
    storage.openApiVersion = opts.openApiVersion;
    storage.format = opts.format;
    storage.swaggerDefinitionFilePath = absOut;
    storage.relativePath = false;
    storage.swaggerEndPointUrl = "/api-docs";

    return absOut;
}

describe("Workstream 1 — OpenAPI output", () => {
    let tmpDir: string;

    beforeEach(() => {
        clearStorages();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "swaggiffy-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        clearStorages();
    });

    it('generated v3 spec has openapi: "3.0.x" at top level and no swaggerDefinition wrapper', () => {
        const out = setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        registerSchema("User", { id: 0, name: "" });
        const router = makeRouter([{ method: "get", path: "/" }]);
        registerDefinition(router, { basePath: "/users", mappedSchema: "User", tags: "Users" });
        Runner.execute();

        const doc = JSON.parse(fs.readFileSync(out, "utf8"));
        expect(doc).to.have.property("openapi");
        expect(String(doc.openapi)).to.match(/^3\./);
        expect(doc).to.not.have.property("swaggerDefinition");
        expect(doc).to.not.have.property("apis");
        expect(doc.components).to.have.property("schemas");
        expect(doc.components.schemas).to.have.property("User");
    });

    it('generated v2 spec has swagger: "2.0" at top level and no swaggerDefinition wrapper', () => {
        const out = setupConfig(tmpDir, { openApiVersion: "2.0", format: "json" });
        registerSchema("Item", { id: 0, name: "" });
        const router = makeRouter([{ method: "get", path: "/" }]);
        registerDefinition(router, { basePath: "/items", mappedSchema: "Item", tags: "Items" });
        Runner.execute();

        const doc = JSON.parse(fs.readFileSync(out, "utf8"));
        expect(doc.swagger).to.equal("2.0");
        expect(doc).to.not.have.property("swaggerDefinition");
        expect(doc).to.not.have.property("apis");
        expect(doc.definitions).to.have.property("Item");
    });

    it("YAML output is parseable and matches equivalent JSON structure", () => {
        const outYaml = setupConfig(tmpDir, { openApiVersion: "3.0", format: "yaml", outFile: "./swagger.yaml" });
        registerSchema("User", { id: 0, name: "" });
        registerDefinition(makeRouter([{ method: "get", path: "/" }]), {
            basePath: "/users",
            mappedSchema: "User",
            tags: "Users",
        });
        Runner.execute();

        const yamlText = fs.readFileSync(outYaml, "utf8");
        const fromYaml = yaml.load(yamlText) as Record<string, unknown>;
        expect(fromYaml).to.have.property("openapi");
        expect((fromYaml.components as any).schemas).to.have.property("User");

        // Same config as JSON
        clearStorages();
        const outJson = setupConfig(tmpDir, { openApiVersion: "3.0", format: "json", outFile: "./swagger.json" });
        registerSchema("User", { id: 0, name: "" });
        registerDefinition(makeRouter([{ method: "get", path: "/" }]), {
            basePath: "/users",
            mappedSchema: "User",
            tags: "Users",
        });
        Runner.execute();
        const fromJson = JSON.parse(fs.readFileSync(outJson, "utf8"));

        expect(fromYaml.openapi).to.equal(fromJson.openapi);
        expect(Object.keys((fromYaml.paths as object) || {})).to.deep.equal(Object.keys(fromJson.paths || {}));
    });

    it("route with no security option produces no security field on the operation", () => {
        setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        registerDefinition(makeRouter([{ method: "get", path: "/" }]), {
            basePath: "/public",
            mappedSchema: "User",
            tags: "Public",
        });
        const paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        const op = (paths as any)["/public/"]?.get || (paths as any)["/public"]?.get;
        expect(op).to.exist;
        expect(op).to.not.have.property("security");
    });

    it("route with explicit security produces the exact security object passed", () => {
        setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        const security = [{ bearerAuth: [] as string[] }];
        registerDefinition(makeRouter([{ method: "get", path: "/" }]), {
            basePath: "/private",
            mappedSchema: "User",
            tags: "Private",
            security,
        });
        const paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        const op = (paths as any)["/private/"]?.get || (paths as any)["/private"]?.get;
        expect(op.security).to.deep.equal(security);
    });

    it('route with header params produces a parameters entry with in: "header"', () => {
        setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        registerDefinition(makeRouter([{ method: "get", path: "/" }]), {
            basePath: "/tasks",
            mappedSchema: "Task",
            tags: "Tasks",
            parameters: [{ in: "header", name: "X-Request-ID", required: false, type: "string" }],
        });
        const paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        const op = (paths as any)["/tasks/"]?.get || (paths as any)["/tasks"]?.get;
        const header = (op.parameters as any[]).find((p) => p.in === "header" && p.name === "X-Request-ID");
        expect(header).to.exist;
    });

    it("POST route in v3 config produces requestBody, not an in: body parameter", () => {
        setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        registerDefinition(makeRouter([{ method: "post", path: "/" }]), {
            basePath: "/users",
            mappedSchema: "User",
            tags: "Users",
        });
        const paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        const op = (paths as any)["/users/"]?.post || (paths as any)["/users"]?.post;
        expect(op).to.have.property("requestBody");
        expect(op.requestBody.content["application/json"].schema.$ref).to.equal("#/components/schemas/User");
        const bodyParam = (op.parameters || []).find((p: any) => p.in === "body");
        expect(bodyParam).to.be.undefined;
    });

    it("query parameters declared in options appear as in: query", () => {
        setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        registerDefinition(makeRouter([{ method: "get", path: "/" }]), {
            basePath: "/events",
            mappedSchema: "Event",
            tags: "Events",
            parameters: [{ in: "query", name: "published", required: false, type: "boolean" }],
        });
        const paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        const op = (paths as any)["/events/"]?.get || (paths as any)["/events"]?.get;
        const q = (op.parameters as any[]).find((p) => p.in === "query" && p.name === "published");
        expect(q).to.exist;
        expect(q.schema.type).to.equal("boolean");
    });

    it("formData parameters become requestBody in v3 and stay formData in v2", () => {
        setupConfig(tmpDir, { openApiVersion: "3.0", format: "json" });
        registerDefinition(makeRouter([{ method: "post", path: "/upload" }]), {
            basePath: "/files",
            mappedSchema: "File",
            tags: "Files",
            consumes: ["multipart/form-data"],
            parameters: [{ in: "formData", name: "file", required: true, type: "string" }],
        });
        let paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        let op = (paths as any)["/files/upload"]?.post;
        expect(op.requestBody.content["multipart/form-data"].schema.properties.file).to.exist;
        expect((op.parameters || []).some((p: any) => p.in === "formData")).to.equal(false);

        clearStorages();
        setupConfig(tmpDir, { openApiVersion: "2.0", format: "json" });
        registerDefinition(makeRouter([{ method: "post", path: "/upload" }]), {
            basePath: "/files",
            mappedSchema: "File",
            tags: "Files",
            parameters: [{ in: "formData", name: "file", required: true, type: "string" }],
        });
        paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        op = (paths as any)["/files/upload"]?.post;
        expect(op.parameters.some((p: any) => p.in === "formData" && p.name === "file")).to.equal(true);
        expect(op).to.not.have.property("requestBody");
    });

    it("POST route in v2 config produces an in: body parameter", () => {
        setupConfig(tmpDir, { openApiVersion: "2.0", format: "json" });
        registerDefinition(makeRouter([{ method: "post", path: "/" }]), {
            basePath: "/users",
            mappedSchema: "User",
            tags: "Users",
        });
        const paths = Utility.toSwaggerAPIDefinition(getAPIDefinitionMetadataStorage().apiDefinitions);
        const op = (paths as any)["/users/"]?.post || (paths as any)["/users"]?.post;
        expect(op).to.not.have.property("requestBody");
        const bodyParam = (op.parameters || []).find((p: any) => p.in === "body");
        expect(bodyParam).to.exist;
        expect(bodyParam.schema.$ref).to.equal("#/definitions/User");
    });

    it("startup with an old-format swagger file logs a yellow deprecation warning and does not crash", () => {
        const legacyPath = path.join(tmpDir, "legacy.json");
        fs.writeFileSync(
            legacyPath,
            JSON.stringify({
                swaggerDefinition: {
                    swagger: "2.0",
                    info: { title: "Legacy", version: "1.0.0" },
                    paths: {},
                },
                apis: [],
            }),
        );

        let warned = false;
        const origWarn = console.log;
        console.log = (...args: unknown[]) => {
            const msg = args.map(String).join(" ");
            if (msg.includes("DEPRECATION") && msg.includes("swaggerDefinition")) warned = true;
            // swallow chalk output
        };

        try {
            const doc = SpecFile.load(legacyPath, { warnLegacy: true });
            expect(doc).to.have.property("swagger", "2.0");
            expect(doc).to.not.have.property("swaggerDefinition");
            expect(warned).to.equal(true);
        } finally {
            console.log = origWarn;
        }
    });

    it("startup with an old-format swagger file still yields a servable OpenAPI document", () => {
        const legacyPath = path.join(tmpDir, "legacy.json");
        fs.writeFileSync(
            legacyPath,
            JSON.stringify({
                swaggerDefinition: {
                    swagger: "2.0",
                    info: { title: "Legacy", version: "1.0.0" },
                    paths: { "/ping": { get: { responses: { "200": { description: "ok" } } } } },
                },
                apis: [],
            }),
        );

        const origLog = console.log;
        console.log = () => undefined;
        try {
            const doc = SpecFile.load(legacyPath);
            expect(doc.paths).to.have.property("/ping");
            // Suitable for swagger-ui-express.setup(doc)
            expect(doc.info).to.deep.include({ title: "Legacy", version: "1.0.0" });
        } finally {
            console.log = origLog;
        }
    });
});
