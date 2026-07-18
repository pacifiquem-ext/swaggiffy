import { SwaggiffyError } from "../errors/SwaggiffyError";
import { TClassDef, TClassProp } from "../typings";
import { formatReference, mapSqlishType, serializeDefault, toClassDef } from "./orm.helpers";

const DRIZZLE_COLUMNS = Symbol.for("drizzle:Columns");
const DRIZZLE_NAME = Symbol.for("drizzle:Name");
const DRIZZLE_ORIGINAL_NAME = Symbol.for("drizzle:OriginalName");
const DRIZZLE_IS_TABLE = Symbol.for("drizzle:IsDrizzleTable");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = Record<string | symbol, any>;

export function isDrizzleTable(schema: unknown): boolean {
    if (!schema || typeof schema !== "object") return false;
    const s = schema as AnyRec;
    return Boolean(s[DRIZZLE_IS_TABLE] || s[DRIZZLE_COLUMNS]);
}

function tableNameOf(table: AnyRec): string | undefined {
    return table[DRIZZLE_NAME] || table[DRIZZLE_ORIGINAL_NAME];
}

function collectForeignKeys(table: AnyRec): AnyRec[] {
    const keys: AnyRec[] = [];
    for (const sym of Object.getOwnPropertySymbols(table)) {
        if (!String(sym).includes("ForeignKeys")) continue;
        const value = table[sym];
        if (Array.isArray(value)) keys.push(...value);
        else if (value && typeof value === "object") keys.push(...(Object.values(value) as AnyRec[]));
    }
    return keys;
}

function resolveFkTarget(fk: AnyRec): { localSqlName: string; target: string } | undefined {
    try {
        const ref = typeof fk.reference === "function" ? fk.reference() : fk.reference;
        if (!ref) return undefined;
        const local = Array.isArray(ref.columns) ? ref.columns[0] : undefined;
        const foreign = Array.isArray(ref.foreignColumns) ? ref.foreignColumns[0] : undefined;
        const foreignTable = ref.foreignTable;
        const localSqlName: string | undefined = local?.name || local?.config?.name;
        const foreignCol: string | undefined = foreign?.name || foreign?.config?.name;
        const foreignTableName: string | undefined = foreignTable ? tableNameOf(foreignTable) : undefined;
        const target = formatReference(foreignTableName, foreignCol);
        if (!localSqlName || !target) return undefined;
        return { localSqlName, target };
    } catch {
        return undefined;
    }
}

function getColumns(table: AnyRec): Record<string, AnyRec> {
    const fromSymbol = table[DRIZZLE_COLUMNS];
    if (fromSymbol && typeof fromSymbol === "object") return fromSymbol;
    const cols: Record<string, AnyRec> = {};
    for (const key of Object.keys(table)) {
        if (key === "_" || key === "enableRLS") continue;
        const col = table[key];
        if (col && typeof col === "object" && (col.dataType || col.columnType || col.name)) {
            cols[key] = col;
        }
    }
    return cols;
}

/**
 * Extract a TClassDef from a Drizzle `pgTable` / `mysqlTable` / `sqliteTable` definition.
 * Captures types, notNull, defaults, varchar length, and `.references()` foreign keys.
 */
export function extractDrizzle(schema: unknown, name?: string): TClassDef {
    if (!isDrizzleTable(schema)) {
        throw new SwaggiffyError(
            `Expected a Drizzle table (pgTable / mysqlTable / sqliteTable) when orm is "drizzle". Received: ${typeof schema}`,
        );
    }

    const table = schema as AnyRec;
    const columns = getColumns(table);
    const fkBySqlName = new Map<string, string>();
    for (const fk of collectForeignKeys(table)) {
        const resolved = resolveFkTarget(fk);
        if (resolved) fkBySqlName.set(resolved.localSqlName, resolved.target);
    }

    const props: TClassProp[] = [];
    for (const prop of Object.keys(columns)) {
        const col = columns[prop];
        const columnType: string = col.columnType || col.config?.columnType || col.dataType || "";
        const mapped = mapSqlishType(columnType || col.dataType);
        const notNull = col.notNull === true || col.config?.notNull === true || col.primary === true;
        const length = col.length ?? col.config?.length;
        const sqlName: string = col.name || col.config?.name || prop;
        const refs = fkBySqlName.get(sqlName);

        const field: TClassProp = {
            prop,
            type: mapped.type,
            format: mapped.format,
            required: notNull || undefined,
            nullable: notNull ? undefined : true,
        };

        if (typeof length === "number") field.maxLength = length;

        if (col.hasDefault || col.config?.hasDefault) {
            const def = serializeDefault(col.default !== undefined ? col.default : col.config?.default);
            if (def !== undefined) field.default = def;
            else if (col.defaultFn || col.config?.defaultFn) field.default = "now()";
        }

        if (Array.isArray(col.enumValues) && col.enumValues.length) {
            field.enum = col.enumValues;
        }

        if (refs) {
            field.references = refs;
            field.description = `Foreign key referencing ${refs}`;
        }

        props.push(field);
    }

    return toClassDef(name || tableNameOf(table), props);
}
