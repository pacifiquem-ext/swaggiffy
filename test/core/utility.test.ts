import { expect } from 'chai';
import { Utility } from '../../lib/utils/Utility';
import { TClassDef } from '../../lib/typings';

describe('Utility.castJSType', () => {
    it('maps string to swagger string', () => {
        const [type, format] = Utility.castJSType('string');
        expect(type).to.equal('string');
        expect(format).to.be.undefined;
    });

    it('maps number to swagger number', () => {
        const [type] = Utility.castJSType('number');
        expect(type).to.equal('number');
    });

    it('maps bigint to swagger number', () => {
        const [type] = Utility.castJSType('bigint');
        expect(type).to.equal('number');
    });

    it('maps boolean to swagger boolean', () => {
        const [type] = Utility.castJSType('boolean');
        expect(type).to.equal('boolean');
    });

    it('maps object to swagger object', () => {
        const [type] = Utility.castJSType('object');
        expect(type).to.equal('object');
    });

    it('maps unknown type to swagger object', () => {
        const [type] = Utility.castJSType('unknown_type');
        expect(type).to.equal('object');
    });
});

describe('Utility.genSchemaDef', () => {
    it('generates a swagger schema definition from a class definition', () => {
        const classDef: TClassDef = {
            name: 'User',
            props: [
                { prop: 'id', type: 'number' },
                { prop: 'name', type: 'string' },
                { prop: 'email', type: 'string' },
            ],
        };

        const result = Utility.genSchemaDef(classDef);

        expect(result).to.have.property('User');
        expect(result['User'].type).to.equal('object');
        expect(result['User'].properties).to.have.property('id');
        expect(result['User'].properties).to.have.property('name');
        expect(result['User'].properties).to.have.property('email');
    });

    it('sets correct types on properties', () => {
        const classDef: TClassDef = {
            name: 'Product',
            props: [
                { prop: 'price', type: 'number' },
                { prop: 'active', type: 'boolean' },
            ],
        };

        const result = Utility.genSchemaDef(classDef);
        expect(result['Product'].properties['price'].type).to.equal('number');
        expect(result['Product'].properties['active'].type).to.equal('boolean');
    });

    it('handles empty props array', () => {
        const classDef: TClassDef = { name: 'Empty', props: [] };
        const result = Utility.genSchemaDef(classDef);
        expect(result).to.have.property('Empty');
        expect(result['Empty'].properties).to.deep.equal({});
    });
});

describe('Utility.toSwaggerSchema', () => {
    it('merges multiple schema metadata entries into one definition', () => {
        const schemas = [
            {
                target: {} as any,
                name: 'User',
                swaggerDefinition: {
                    User: { type: 'object' as const, properties: {} },
                },
            },
            {
                target: {} as any,
                name: 'Event',
                swaggerDefinition: {
                    Event: { type: 'object' as const, properties: {} },
                },
            },
        ];

        const result = Utility.toSwaggerSchema(schemas as any);
        expect(result).to.have.property('User');
        expect(result).to.have.property('Event');
    });
});
