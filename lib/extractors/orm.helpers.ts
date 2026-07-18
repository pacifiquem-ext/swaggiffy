import { TClassDef, TClassProp, TSwaggerDataType, TSwaggerNumberFormats, TSwaggerStringFormats } from "../typings";

export type MappedType = {
    type: TSwaggerDataType;
    format?: TSwaggerNumberFormats | TSwaggerStringFormats;
    maxLength?: number;
};

/**
 * Turn ORM default values into JSON-serializable OpenAPI defaults.
 * Functions and SQL fragments become a short string (e.g. "now()");
 * unrepresentable values are dropped.
 */
export function serializeDefault(value: unknown): unknown {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") return value;
    if (t === "bigint") return Number(value);
    if (value instanceof Date) return value.toISOString();

    if (typeof value === "function") {
        const name = value.name || "";
        if (/now/i.test(name)) return "now()";
        if (/uuid/i.test(name)) return "uuid()";
        return undefined;
    }

    if (value && typeof value === "object") {
        const rec = value as Record<string, unknown>;
        if ("queryChunks" in rec || rec.decoder) return "now()";
        if (typeof rec.name === "string" && (rec.args !== undefined || rec.name.length < 32)) {
            const n = rec.name;
            if (n === "now") return "now()";
            if (n === "autoincrement" || n === "cuid" || n === "uuid" || n === "cuid2") return `${n}()`;
            return n;
        }
    }

    return undefined;
}

/** Unwrap mongoose-style `[value, message]` constraint tuples. */
export function unwrapConstraint(value: unknown): number | undefined {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (Array.isArray(value) && typeof value[0] === "number") return value[0];
    return undefined;
}

export function normalizeEnum(value: unknown): Array<string | number | boolean> | undefined {
    if (!value) return undefined;
    if (Array.isArray(value) && value.length > 0) {
        return value.filter((v) => v !== undefined && typeof v !== "object") as Array<string | number | boolean>;
    }
    if (typeof value === "object" && value !== null && Array.isArray((value as { values?: unknown[] }).values)) {
        return normalizeEnum((value as { values: unknown[] }).values);
    }
    return undefined;
}

export function toClassDef(name: string | undefined, props: TClassProp[]): TClassDef {
    return { name: name || "Schema", props };
}

export function indexByProp(props: TClassProp[]): Record<string, TClassProp> {
    const out: Record<string, TClassProp> = {};
    for (const p of props) out[p.prop] = p;
    return out;
}

const SQL_TYPE_ALIASES: Record<string, MappedType> = {
    "string": { type: "string" },
    varchar: { type: "string" },
    char: { type: "string" },
    text: { type: "string" },
    citext: { type: "string" },
    tinytext: { type: "string" },
    mediumtext: { type: "string" },
    longtext: { type: "string" },
    integer: { type: "integer", format: "int32" },
    int: { type: "integer", format: "int32" },
    int2: { type: "integer", format: "int32" },
    int4: { type: "integer", format: "int32" },
    int32: { type: "integer", format: "int32" },
    smallint: { type: "integer", format: "int32" },
    tinyint: { type: "integer", format: "int32" },
    serial: { type: "integer", format: "int32" },
    smallserial: { type: "integer", format: "int32" },
    increments: { type: "integer", format: "int32" },
    bigint: { type: "integer", format: "int64" },
    int8: { type: "integer", format: "int64" },
    int64: { type: "integer", format: "int64" },
    bigserial: { type: "integer", format: "int64" },
    bigincrements: { type: "integer", format: "int64" },
    "number": { type: "number" },
    float: { type: "number", format: "float" },
    real: { type: "number", format: "float" },
    double: { type: "number", format: "double" },
    "double precision": { type: "number", format: "double" },
    decimal: { type: "number", format: "double" },
    numeric: { type: "number", format: "double" },
    "boolean": { type: "boolean" },
    bool: { type: "boolean" },
    date: { type: "string", format: "date" },
    dateonly: { type: "string", format: "date" },
    datetime: { type: "string", format: "date-time" },
    timestamp: { type: "string", format: "date-time" },
    timestamptz: { type: "string", format: "date-time" },
    "timestamp with time zone": { type: "string", format: "date-time" },
    "timestamp without time zone": { type: "string", format: "date-time" },
    time: { type: "string" },
    uuid: { type: "string", format: "uuid" },
    uuidv4: { type: "string", format: "uuid" },
    json: { type: "object" },
    jsonb: { type: "object" },
    object: { type: "object" },
    blob: { type: "string", format: "binary" },
    bytea: { type: "string", format: "byte" },
    bytes: { type: "string", format: "byte" },
    buffer: { type: "string", format: "byte" },
    binary: { type: "string", format: "binary" },
    enum: { type: "string" },
};

/**
 * Map a SQL / ORM type name (Sequelize key, TypeORM type, Knex descriptor, Drizzle columnType)
 * onto an OpenAPI type + format.
 */
export function mapSqlishType(raw: unknown): MappedType {
    if (raw == null) return { type: "object" };

    if (typeof raw === "function") {
        const fnName = raw.name || "";
        if (fnName === "String") return { type: "string" };
        if (fnName === "Number") return { type: "number" };
        if (fnName === "Boolean") return { type: "boolean" };
        if (fnName === "Date") return { type: "string", format: "date-time" };
        if (fnName === "Array") return { type: "array" };
        if (fnName === "Object" || fnName === "ObjectID") return fnName === "ObjectID" ? { type: "string" } : { type: "object" };
        return mapSqlishType(fnName);
    }

    const original = String(raw).trim();
    if (!original) return { type: "object" };

    // Strip dialect prefixes: PgVarchar, MySqlInt, SQLiteInteger
    const stripped = original.replace(/^(Pg|MySql|SQLite|Mysql)/i, "");
    const lower = stripped.toLowerCase();

    if (SQL_TYPE_ALIASES[lower]) return { ...SQL_TYPE_ALIASES[lower] };
    if (SQL_TYPE_ALIASES[original.toLowerCase()]) return { ...SQL_TYPE_ALIASES[original.toLowerCase()] };

    if (lower.includes("serial") || lower.includes("int")) {
        if (lower.includes("big")) return { type: "integer", format: "int64" };
        return { type: "integer", format: "int32" };
    }
    if (lower.includes("bool")) return { type: "boolean" };
    if (lower.includes("uuid")) return { type: "string", format: "uuid" };
    if (lower.includes("json")) return { type: "object" };
    if (lower.includes("time") || lower.includes("date")) {
        return { type: "string", format: lower === "date" || lower.endsWith("date") && !lower.includes("time") ? "date" : "date-time" };
    }
    if (lower.includes("char") || lower.includes("text") || lower.includes("string")) return { type: "string" };
    if (lower.includes("numeric") || lower.includes("decimal") || lower.includes("float") || lower.includes("double") || lower.includes("real")) {
        return { type: "number", format: "double" };
    }
    if (lower.includes("enum")) return { type: "string" };
    if (lower.includes("array")) return { type: "array" };

    return { type: "object" };
}

export function formatReference(table: string | undefined, column: string | undefined): string | undefined {
    if (!table && !column) return undefined;
    if (table && column) return `${table}.${column}`;
    return table || column;
}

export function tryRequire<T = unknown>(mod: string): T | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(mod) as T;
    } catch {
        return null;
    }
}
