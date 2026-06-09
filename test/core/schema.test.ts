/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect } from "chai";
import { Schema } from "../../lib/decorators/Schema";
import { getSchemaMetadataStorage } from "../../lib/globals";
import { SchemaExtractor } from "../../lib/extractors/schema.extractor";

function clearSchemaStorage() {
    const storage = getSchemaMetadataStorage();
    (storage.schemas as unknown[]).splice(0);
}

describe("@Schema decorator", () => {
    beforeEach(clearSchemaStorage);

    it("registers a decorated class in schema storage", () => {
        @Schema("TestUser")
        class TestUser {
            id = 0;
            name = "";
            email = "";
        }

        const storage = getSchemaMetadataStorage();
        expect(storage.schemas).to.have.length(1);
        expect(storage.schemas[0].name).to.equal("TestUser");
    });

    it("uses the class name when no name argument is given", () => {
        @Schema()
        class MyModel {
            value = "";
        }

        const storage = getSchemaMetadataStorage();
        expect(storage.schemas[0].name).to.equal("MyModel");
    });

    it("generates correct swagger definition types", () => {
        @Schema("TypedModel")
        class TypedModel {
            count = 0;
            label = "";
            active = false;
        }

        const storage = getSchemaMetadataStorage();
        const def = storage.schemas[0].swaggerDefinition["TypedModel"];
        expect(def.properties["count"].type).to.equal("number");
        expect(def.properties["label"].type).to.equal("string");
        expect(def.properties["active"].type).to.equal("boolean");
    });

    it("registers multiple decorated classes independently", () => {
        @Schema("Alpha")
        class Alpha { x = 0; }

        @Schema("Beta")
        class Beta { y = ""; }

        const storage = getSchemaMetadataStorage();
        expect(storage.schemas).to.have.length(2);
        const names = storage.schemas.map((s) => s.name);
        expect(names).to.include("Alpha");
        expect(names).to.include("Beta");
    });
});

describe("SchemaExtractor.extractClassProps", () => {
    it("extracts properties from a class instance", () => {
        class SampleEntity {
            id = 0;
            title = "test";
        }

        const result = SchemaExtractor.extractClassProps(SampleEntity);
        expect(result.name).to.equal("SampleEntity");
        expect(result.props.map((p) => p.prop)).to.include.members(["id", "title"]);
    });

    it("uses the provided name override", () => {
        class Foo { x = 1; }
        const result = SchemaExtractor.extractClassProps(Foo, "CustomName");
        expect(result.name).to.equal("CustomName");
    });

    it("maps JS types to swagger types correctly", () => {
        class Typed { num = 0; str = ""; flag = true; }
        const result = SchemaExtractor.extractClassProps(Typed);
        const byProp = Object.fromEntries(result.props.map((p) => [p.prop, p]));
        expect(byProp["num"].type).to.equal("number");
        expect(byProp["str"].type).to.equal("string");
        expect(byProp["flag"].type).to.equal("boolean");
    });
});

describe("SchemaExtractor.extractPlain", () => {
    it("extracts properties from a plain object", () => {
        const plain = { id: 0, name: "", active: false };
        const result = SchemaExtractor.extractPlain(plain, "PlainSchema");
        expect(result.name).to.equal("PlainSchema");
        const propNames = result.props.map((p) => p.prop);
        expect(propNames).to.include.members(["id", "name", "active"]);
    });

    it("assigns correct swagger types", () => {
        const plain = { count: 42, label: "hello" };
        const result = SchemaExtractor.extractPlain(plain);
        const byProp = Object.fromEntries(result.props.map((p) => [p.prop, p]));
        expect(byProp["count"].type).to.equal("number");
        expect(byProp["label"].type).to.equal("string");
    });
});
