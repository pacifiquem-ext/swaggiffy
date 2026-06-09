import { expect } from "chai";
import { registerDefinition } from "../../lib/helpers/registerDefinition";
import { getAPIDefinitionMetadataStorage } from "../../lib/globals";

function clearDefinitionStorage() {
    const storage = getAPIDefinitionMetadataStorage();
    (storage.apiDefinitions as unknown[]).splice(0);
}

function makeRouter(routes: Array<{ method: string; path: string }>) {
    return {
        stack: routes.map((r) => ({
            route: {
                path: r.path,
                stack: [{ method: r.method }],
            },
            keys: [],
        })),
    };
}

describe("registerDefinition", () => {
    beforeEach(clearDefinitionStorage);

    it("registers GET routes in API definition storage", () => {
        const router = makeRouter([{ method: "get", path: "/" }]);
        registerDefinition(router, {
            basePath: "/api/users",
            mappedSchema: "User",
            tags: "Users",
            summary: "Get all users",
        });

        const storage = getAPIDefinitionMetadataStorage();
        expect(storage.apiDefinitions).to.have.length(1);
        expect(storage.apiDefinitions[0].apiDefinition.method).to.equal("get");
        expect(storage.apiDefinitions[0].apiDefinition.pathString).to.equal("/api/users/");
    });

    it("registers POST routes with a body parameter", () => {
        const router = makeRouter([{ method: "post", path: "/" }]);
        registerDefinition(router, {
            basePath: "/api/users",
            mappedSchema: "User",
            tags: "Users",
        });

        const storage = getAPIDefinitionMetadataStorage();
        const def = storage.apiDefinitions[0].apiDefinition;
        expect(def.method).to.equal("post");
        const bodyParam = def.meta.parameters?.find((p) => p.in === "body");
        expect(bodyParam).to.exist;
        expect((bodyParam as { schema: { $ref: string } }).schema.$ref).to.equal("#/definitions/User");
    });

    it("registers DELETE routes with a 200 deleted response", () => {
        const router = makeRouter([{ method: "delete", path: "/:id" }]);
        registerDefinition(router, {
            basePath: "/api/users",
            mappedSchema: "User",
            tags: "Users",
        });

        const storage = getAPIDefinitionMetadataStorage();
        const def = storage.apiDefinitions[0].apiDefinition;
        expect(def.method).to.equal("delete");
        expect(def.meta.responses).to.have.property("200");
    });

    it("registers PUT routes with a body parameter", () => {
        const router = makeRouter([{ method: "put", path: "/:id" }]);
        registerDefinition(router, {
            basePath: "/api/items",
            mappedSchema: "Item",
            tags: "Items",
        });

        const storage = getAPIDefinitionMetadataStorage();
        const def = storage.apiDefinitions[0].apiDefinition;
        const bodyParam = def.meta.parameters?.find((p) => p.in === "body");
        expect(bodyParam).to.exist;
    });

    it("extracts path parameters from route keys", () => {
        const router = {
            stack: [
                {
                    route: { path: "/:id", stack: [{ method: "get" }] },
                    keys: [{ name: "id" }],
                },
            ],
        };

        registerDefinition(router, {
            basePath: "/api/users",
            mappedSchema: "User",
            tags: "Users",
        });

        const storage = getAPIDefinitionMetadataStorage();
        const params = storage.apiDefinitions[0].apiDefinition.meta.parameters || [];
        const pathParam = params.find((p) => p.in === "path");
        expect(pathParam).to.exist;
        expect(pathParam?.name).to.equal("id");
    });

    it("stores tags as an array split from the tags string", () => {
        const router = makeRouter([{ method: "get", path: "/" }]);
        registerDefinition(router, {
            basePath: "/api/items",
            mappedSchema: "Item",
            tags: "Items",
        });

        const storage = getAPIDefinitionMetadataStorage();
        expect(storage.apiDefinitions[0].apiDefinition.tags).to.deep.equal(["Items"]);
    });

    it("skips stack entries without a route", () => {
        const router = {
            stack: [
                { route: undefined, keys: [] },
                { route: { path: "/", stack: [{ method: "get" }] }, keys: [] },
            ],
        };

        registerDefinition(router, { basePath: "/api/test", mappedSchema: "Test", tags: "Test" });
        const storage = getAPIDefinitionMetadataStorage();
        expect(storage.apiDefinitions).to.have.length(1);
    });

    it("registers multiple routes from one router", () => {
        const router = makeRouter([
            { method: "get", path: "/" },
            { method: "get", path: "/:id" },
            { method: "post", path: "/" },
            { method: "put", path: "/:id" },
            { method: "delete", path: "/:id" },
        ]);

        registerDefinition(router, { basePath: "/api/items", mappedSchema: "Item", tags: "Items" });
        const storage = getAPIDefinitionMetadataStorage();
        expect(storage.apiDefinitions).to.have.length(5);
    });
});
