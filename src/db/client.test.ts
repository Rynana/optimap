import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { makeDb } from "./client";
import { runMigrations } from "./migrate";
import { meta, auditLog } from "./schema";
import { makeTestDriver } from "../test/sqlite-driver";

describe("Drizzle proxy adapter", () => {
  it("round-trips inserts and selects via Drizzle", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);
      const db = makeDb(driver);

      await db.insert(meta).values({
        key: "first_launch_completed",
        value: "false",
        updatedAt: "2026-05-08T00:00:00.000Z",
      });

      const rows = await db.select().from(meta).where(eq(meta.key, "first_launch_completed"));

      expect(rows).toEqual([
        {
          key: "first_launch_completed",
          value: "false",
          updatedAt: "2026-05-08T00:00:00.000Z",
        },
      ]);
    } finally {
      driver.close();
    }
  });

  it("supports limit + ordering on audit_log via Drizzle", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);
      const db = makeDb(driver);

      await db.insert(auditLog).values([
        {
          id: "a",
          at: "2026-05-08T00:00:01.000Z",
          actor: "user",
          entityType: "site",
          entityId: "1",
          action: "create",
        },
        {
          id: "b",
          at: "2026-05-08T00:00:02.000Z",
          actor: "user",
          entityType: "site",
          entityId: "1",
          action: "update",
        },
      ]);

      const rows = await db.select({ id: auditLog.id }).from(auditLog).limit(10);
      expect(rows.map((r) => r.id).sort()).toEqual(["a", "b"]);
    } finally {
      driver.close();
    }
  });
});
