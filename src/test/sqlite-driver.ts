import BetterSqlite3 from "better-sqlite3";
import type { SqlDriver } from "../db/driver";

export type TestDriver = SqlDriver & { close(): void; raw: BetterSqlite3.Database };

/**
 * In-memory (or file-backed) SQLite driver implementing {@link SqlDriver},
 * used by Vitest. Mirrors the surface of `@tauri-apps/plugin-sql` enough for
 * the migration runner and Drizzle proxy adapter to round-trip queries.
 */
export function makeTestDriver(filename = ":memory:"): TestDriver {
  const sqlite = new BetterSqlite3(filename);
  return {
    raw: sqlite,
    async execute(sql: string, params?: unknown[]): Promise<void> {
      if (!params || params.length === 0) {
        sqlite.exec(sql);
        return;
      }
      // better-sqlite3's typed run() expects a tuple of bind values; we pass a
      // runtime-built unknown[]. Cast at this single boundary instead of
      // threading better-sqlite3 types through the rest of the codebase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sqlite.prepare(sql).run(...(params as any[]));
    },
    async select<T>(sql: string, params?: unknown[]): Promise<T> {
      const stmt = sqlite.prepare(sql);
      const rows =
        params && params.length > 0
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stmt.all(...(params as any[]))
          : stmt.all();
      return rows as T;
    },
    close() {
      sqlite.close();
    },
  };
}
