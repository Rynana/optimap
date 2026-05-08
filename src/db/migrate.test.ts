import { describe, it, expect } from "vitest";
import { runMigrations } from "./migrate";
import { makeTestDriver } from "../test/sqlite-driver";

type MetaRow = { key: string; value: string; updated_at: string };
type CountRow = { count: number };
type TableRow = { name: string };

describe("runMigrations", () => {
  it("creates the meta table and seeds schema_version", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);
      const rows = await driver.select<MetaRow[]>(
        "SELECT key, value, updated_at FROM meta WHERE key = 'schema_version'",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe("1");
      expect(rows[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } finally {
      driver.close();
    }
  });

  it("creates the audit_log table with the expected columns and index", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);

      const tables = await driver.select<TableRow[]>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'",
      );
      expect(tables).toHaveLength(1);

      const cols = await driver.select<Array<{ name: string }>>(
        "SELECT name FROM pragma_table_info('audit_log')",
      );
      const colNames = cols.map((c) => c.name).sort();
      expect(colNames).toEqual(
        ["action", "actor", "after", "at", "before", "entity_id", "entity_type", "id"].sort(),
      );

      const indexes = await driver.select<TableRow[]>(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'audit_log'",
      );
      expect(indexes.map((i) => i.name)).toContain("idx_audit_log_at");
    } finally {
      driver.close();
    }
  });

  it("is idempotent on re-run", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);
      await runMigrations(driver);
      await runMigrations(driver);

      const tracker = await driver.select<CountRow[]>(
        "SELECT COUNT(*) as count FROM __drizzle_migrations",
      );
      expect(tracker[0].count).toBe(1);

      const meta = await driver.select<CountRow[]>(
        "SELECT COUNT(*) as count FROM meta WHERE key = 'schema_version'",
      );
      expect(meta[0].count).toBe(1);
    } finally {
      driver.close();
    }
  });

  it("inserts can round-trip through the audit_log table", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);
      await driver.execute(
        `INSERT INTO audit_log (id, at, actor, entity_type, entity_id, action, before, after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "01HF000000000000000000000",
          "2026-05-08T00:00:00.000Z",
          "user",
          "site",
          "abc",
          "create",
          null,
          '{"name":"Test"}',
        ],
      );
      const rows = await driver.select<Array<{ entity_type: string; action: string }>>(
        "SELECT entity_type, action FROM audit_log",
      );
      expect(rows).toEqual([{ entity_type: "site", action: "create" }]);
    } finally {
      driver.close();
    }
  });
});
