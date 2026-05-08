/**
 * Minimal abstraction over a SQLite driver used by the migration runner and
 * the Drizzle proxy adapter. Production code wraps `@tauri-apps/plugin-sql`;
 * tests wrap a `better-sqlite3` instance.
 */
export type SqlDriver = {
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T>(sql: string, params?: unknown[]): Promise<T>;
};
