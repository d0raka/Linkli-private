import { DatabaseSync } from "node:sqlite";

/**
 * Minimal D1-compatible adapter over node:sqlite so route handlers run unmodified
 * in Vitest. Mirrors the subset of the D1 API the app uses: prepare().bind().first()/
 * all()/run()/raw(), batch() (transactional) and exec().
 */

type Row = Record<string, unknown>;

export type D1RunResult = { success: true; results: unknown[]; meta: { changes: number; last_row_id: number } };

function normalizeParam(value: unknown, index: number): null | number | bigint | string | Uint8Array {
  if (value === undefined) throw new TypeError(`D1_TYPE_ERROR: parameter ${index + 1} is undefined`);
  if (value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "string") return value;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError(`D1_TYPE_ERROR: unsupported parameter type ${typeof value}`);
}

export class FakeD1Statement {
  constructor(private readonly db: DatabaseSync, readonly sql: string, private readonly params: Array<null | number | bigint | string | Uint8Array> = []) {}

  bind(...params: unknown[]) {
    return new FakeD1Statement(this.db, this.sql, params.map(normalizeParam));
  }

  private statement() {
    return this.db.prepare(this.sql);
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.statement().get(...this.params) as Row | undefined;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Row>(): Promise<{ success: true; results: T[]; meta: { changes: number } }> {
    const results = this.statement().all(...this.params) as T[];
    return { success: true, results, meta: { changes: 0 } };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const rows = this.statement().all(...this.params) as Row[];
    return rows.map((row) => Object.values(row) as unknown as T);
  }

  async run(): Promise<D1RunResult> {
    const info = this.statement().run(...this.params);
    return { success: true, results: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }

  /** Like D1, a batched statement that produces rows returns them in `results`. */
  runSync(): D1RunResult {
    if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(this.sql) || /\bRETURNING\b/i.test(this.sql)) {
      const results = this.statement().all(...this.params);
      return { success: true, results, meta: { changes: 0, last_row_id: 0 } };
    }
    const info = this.statement().run(...this.params);
    return { success: true, results: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }
}

export class FakeD1Database {
  readonly sqlite: DatabaseSync;

  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
    // D1 enforces foreign keys by default.
    this.sqlite.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql: string) {
    return new FakeD1Statement(this.sqlite, sql);
  }

  async exec(sql: string) {
    this.sqlite.exec(sql);
    return { count: sql.split(";").filter((part) => part.trim()).length, duration: 0 };
  }

  /** D1 batches are atomic: all statements succeed or none apply. */
  async batch(statements: FakeD1Statement[]): Promise<D1RunResult[]> {
    this.sqlite.exec("BEGIN");
    try {
      const results = statements.map((statement) => statement.runSync());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  tableNames() {
    const rows = this.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }

  /** Removes every row while keeping the schema, for isolation between tests. */
  truncateAll() {
    this.sqlite.exec("PRAGMA foreign_keys = OFF");
    for (const table of this.tableNames()) this.sqlite.exec(`DELETE FROM "${table}"`);
    this.sqlite.exec("PRAGMA foreign_keys = ON");
  }
}

export function createFakeD1() {
  return new FakeD1Database();
}
