import type { SqlDriver } from "./driver";

const migrationFiles = import.meta.glob("./migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type ParsedMigration = {
  tag: string;
  index: number;
  sql: string;
  statements: string[];
  hash: string;
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadMigrations(): Promise<ParsedMigration[]> {
  const entries = await Promise.all(
    Object.entries(migrationFiles).map(async ([path, sql]) => {
      const filename = path
        .split("/")
        .pop()!
        .replace(/\.sql$/, "");
      const idxMatch = filename.match(/^(\d+)_/);
      const index = idxMatch ? parseInt(idxMatch[1], 10) : 0;
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      const hash = await sha256(sql);
      return { tag: filename, index, sql, statements, hash };
    }),
  );
  return entries.sort((a, b) => a.index - b.index);
}

/**
 * Apply any pending migrations. Idempotent: a second run is a no-op once all
 * known migrations have been applied. Migration tracking lives in
 * `__drizzle_migrations`; the human-readable `meta.schema_version` is kept in
 * sync with the highest applied migration index (1-based).
 */
export async function runMigrations(driver: SqlDriver): Promise<void> {
  await driver.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  const applied = await driver.select<Array<{ hash: string }>>(
    "SELECT hash FROM __drizzle_migrations",
  );
  const appliedHashes = new Set(applied.map((r) => r.hash));

  const migrations = await loadMigrations();

  for (const m of migrations) {
    if (appliedHashes.has(m.hash)) continue;
    for (const stmt of m.statements) {
      await driver.execute(stmt);
    }
    await driver.execute("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [
      m.hash,
      Date.now(),
    ]);
  }

  if (migrations.length > 0) {
    const highest = migrations[migrations.length - 1].index + 1;
    await driver.execute(
      `INSERT INTO meta (key, value, updated_at) VALUES ('schema_version', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [String(highest), new Date().toISOString()],
    );
  }
}
