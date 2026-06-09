import { expect } from "chai";
import { registerSchema, registerSchemas } from "../../lib/helpers/registerSchema";
import { getSchemaMetadataStorage } from "../../lib/globals";

function clearSchemaStorage() {
    const storage = getSchemaMetadataStorage();
    (storage.schemas as unknown[]).splice(0);
}

describe("registerSchema (plain object)", () => {
    beforeEach(clearSchemaStorage);

    it("registers a plain object schema", () => {
        registerSchema("User", { id: 0, name: "", email: "" });

        const storage = getSchemaMetadataStorage();
        expect(storage.schemas).to.have.length(1);
        expect(storage.schemas[0].name).to.equal("User");
    });

    it("generates correct swagger definition for a plain object", () => {
        registerSchema("Product", { id: 0, title: "", price: 0.0, available: true });

        const storage = getSchemaMetadataStorage();
        const def = storage.schemas[0].swaggerDefinition["Product"];
        expect(def).to.exist;
        expect(def.type).to.equal("object");
        expect(def.properties).to.have.property("id");
        expect(def.properties).to.have.property("title");
        expect(def.properties).to.have.property("price");
        expect(def.properties).to.have.property("available");
    });

    it("maps JS types to swagger types in plain object", () => {
        registerSchema("TypeCheck", { num: 1, str: "a", flag: false });

        const storage = getSchemaMetadataStorage();
        const props = storage.schemas[0].swaggerDefinition["TypeCheck"].properties;
        expect(props["num"].type).to.equal("number");
        expect(props["str"].type).to.equal("string");
        expect(props["flag"].type).to.equal("boolean");
    });

    it("registers multiple schemas independently", () => {
        registerSchema("Alpha", { x: 0 });
        registerSchema("Beta", { y: "" });

        const storage = getSchemaMetadataStorage();
        expect(storage.schemas).to.have.length(2);
        expect(storage.schemas.map((s) => s.name)).to.include.members(["Alpha", "Beta"]);
    });
});

describe("registerSchemas (bulk registration)", () => {
    beforeEach(clearSchemaStorage);

    it("registers multiple schemas in a single call", () => {
        registerSchemas([
            { name: "User", schema: { id: 0, name: "" } },
            { name: "Event", schema: { id: 0, title: "" } },
        ]);

        const storage = getSchemaMetadataStorage();
        expect(storage.schemas).to.have.length(2);
        expect(storage.schemas.map((s) => s.name)).to.include.members(["User", "Event"]);
    });

    it("generates correct definitions for each schema in bulk", () => {
        registerSchemas([
            { name: "Cat", schema: { name: "", age: 0 } },
        ]);

        const storage = getSchemaMetadataStorage();
        const def = storage.schemas[0].swaggerDefinition["Cat"];
        expect(def.properties).to.have.property("name");
        expect(def.properties).to.have.property("age");
    });
});
