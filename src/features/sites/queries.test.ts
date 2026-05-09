import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { makeTestDriver } from "../../test/sqlite-driver";
import { makeDb } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { auditLog } from "../../db/schema";
import {
  listSites,
  getSiteById,
  createSite,
  updateSite,
  softDeleteSite,
  restoreSite,
  sitesWithinRadiusKm,
} from "./queries";

const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const MELBOURNE = { lat: -37.8136, lng: 144.9631 }; // ~714 km from Sydney
const ADELAIDE = { lat: -34.9285, lng: 138.6007 }; // ~1275 km from Sydney

const BASE_SITE = {
  name: "Test Tower",
  type: "tower" as const,
  status: "active" as const,
  latitude: SYDNEY.lat,
  longitude: SYDNEY.lng,
};

async function setup() {
  const driver = makeTestDriver();
  await runMigrations(driver);
  const db = makeDb(driver);
  return { driver, db };
}

// ---------------------------------------------------------------------------
// create + read
// ---------------------------------------------------------------------------

describe("createSite / getSiteById", () => {
  it("inserts a row and retrieves it by id", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      expect(site.name).toBe("Test Tower");
      expect(site.type).toBe("tower");
      expect(site.status).toBe("active");
      expect(site.deletedAt).toBeNull();
      expect(site.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const found = await getSiteById(db, site.id);
      expect(found).toEqual(site);
    } finally {
      driver.close();
    }
  });

  it("uses a caller-supplied id when provided", async () => {
    const { driver, db } = await setup();
    try {
      const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const site = await createSite(db, { ...BASE_SITE, id });
      expect(site.id).toBe(id);
    } finally {
      driver.close();
    }
  });

  it("returns null for a missing id", async () => {
    const { driver, db } = await setup();
    try {
      const result = await getSiteById(db, "00000000-0000-4000-8000-000000000000");
      expect(result).toBeNull();
    } finally {
      driver.close();
    }
  });

  it("rejects invalid input via Zod", async () => {
    const { driver, db } = await setup();
    try {
      await expect(createSite(db, { ...BASE_SITE, type: "skyscraper" as never })).rejects.toThrow();
    } finally {
      driver.close();
    }
  });

  it("writes a create audit entry", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      const entries = await db.select().from(auditLog).where(eq(auditLog.entityId, site.id));
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe("create");
      expect(entries[0].entityType).toBe("site");
      expect(entries[0].before).toBeNull();
      expect(JSON.parse(entries[0].after!)).toMatchObject({ name: "Test Tower" });
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// update + read
// ---------------------------------------------------------------------------

describe("updateSite", () => {
  it("applies a partial update and returns the updated row", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      const updated = await updateSite(db, site.id, {
        status: "maintenance",
        notes: "Check cables",
      });
      expect(updated.status).toBe("maintenance");
      expect(updated.notes).toBe("Check cables");
      expect(updated.name).toBe("Test Tower"); // unchanged
    } finally {
      driver.close();
    }
  });

  it("persists the update to the database", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await updateSite(db, site.id, { name: "Renamed Tower" });
      const found = await getSiteById(db, site.id);
      expect(found?.name).toBe("Renamed Tower");
    } finally {
      driver.close();
    }
  });

  it("throws for an unknown id", async () => {
    const { driver, db } = await setup();
    try {
      await expect(
        updateSite(db, "00000000-0000-4000-8000-000000000000", { status: "fault" }),
      ).rejects.toThrow("not found");
    } finally {
      driver.close();
    }
  });

  it("rejects invalid enum values via Zod", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await expect(updateSite(db, site.id, { status: "broken" as never })).rejects.toThrow();
    } finally {
      driver.close();
    }
  });

  it("writes an update audit entry with before/after snapshots", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await updateSite(db, site.id, { status: "fault" });
      const entries = await db.select().from(auditLog).where(eq(auditLog.entityId, site.id));
      // create + update = 2 entries
      expect(entries).toHaveLength(2);
      const updateEntry = entries.find((e) => e.action === "update")!;
      expect(JSON.parse(updateEntry.before!)).toMatchObject({ status: "active" });
      expect(JSON.parse(updateEntry.after!)).toMatchObject({ status: "fault" });
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// soft-delete + restore
// ---------------------------------------------------------------------------

describe("softDeleteSite / restoreSite", () => {
  it("soft-delete sets deleted_at and excludes the row from default list", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await softDeleteSite(db, site.id);

      const found = await getSiteById(db, site.id);
      expect(found?.deletedAt).not.toBeNull();

      const list = await listSites(db);
      expect(list.find((s) => s.id === site.id)).toBeUndefined();
    } finally {
      driver.close();
    }
  });

  it("restore clears deleted_at and row reappears in list", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await softDeleteSite(db, site.id);
      await restoreSite(db, site.id);

      const found = await getSiteById(db, site.id);
      expect(found?.deletedAt).toBeNull();

      const list = await listSites(db);
      expect(list.find((s) => s.id === site.id)).toBeDefined();
    } finally {
      driver.close();
    }
  });

  it("softDelete throws for an unknown id", async () => {
    const { driver, db } = await setup();
    try {
      await expect(softDeleteSite(db, "00000000-0000-4000-8000-000000000000")).rejects.toThrow(
        "not found",
      );
    } finally {
      driver.close();
    }
  });

  it("writes soft_delete then restore audit entries", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await softDeleteSite(db, site.id);
      await restoreSite(db, site.id);

      const entries = await db.select().from(auditLog).where(eq(auditLog.entityId, site.id));
      const actions = entries.map((e) => e.action).sort();
      expect(actions).toEqual(["create", "restore", "soft_delete"].sort());
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// listSites filters
// ---------------------------------------------------------------------------

describe("listSites filters", () => {
  it("excludes soft-deleted rows by default", async () => {
    const { driver, db } = await setup();
    try {
      const a = await createSite(db, { ...BASE_SITE, name: "Keep" });
      const b = await createSite(db, { ...BASE_SITE, name: "Delete" });
      await softDeleteSite(db, b.id);

      const results = await listSites(db);
      expect(results.map((s) => s.id)).toContain(a.id);
      expect(results.map((s) => s.id)).not.toContain(b.id);
    } finally {
      driver.close();
    }
  });

  it("includeDeleted: true returns soft-deleted rows too", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await softDeleteSite(db, site.id);

      const without = await listSites(db);
      expect(without.find((s) => s.id === site.id)).toBeUndefined();

      const withDeleted = await listSites(db, { includeDeleted: true });
      expect(withDeleted.find((s) => s.id === site.id)).toBeDefined();
    } finally {
      driver.close();
    }
  });

  it("status filter returns only matching rows", async () => {
    const { driver, db } = await setup();
    try {
      await createSite(db, { ...BASE_SITE, status: "active" });
      await createSite(db, { ...BASE_SITE, status: "maintenance" });
      await createSite(db, { ...BASE_SITE, status: "fault" });

      const results = await listSites(db, { status: "maintenance" });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("maintenance");
    } finally {
      driver.close();
    }
  });

  it("type filter returns only matching rows", async () => {
    const { driver, db } = await setup();
    try {
      await createSite(db, { ...BASE_SITE, type: "tower" });
      await createSite(db, { ...BASE_SITE, type: "rooftop" });
      await createSite(db, { ...BASE_SITE, type: "hut" });

      const results = await listSites(db, { type: "rooftop" });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("rooftop");
    } finally {
      driver.close();
    }
  });

  it("search filter matches on name (case-insensitive for ASCII)", async () => {
    const { driver, db } = await setup();
    try {
      await createSite(db, { ...BASE_SITE, name: "Alpha Tower" });
      await createSite(db, { ...BASE_SITE, name: "Beta Rooftop" });

      const results = await listSites(db, { search: "alpha" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alpha Tower");
    } finally {
      driver.close();
    }
  });

  it("search filter matches on address", async () => {
    const { driver, db } = await setup();
    try {
      await createSite(db, { ...BASE_SITE, name: "Site A", address: "1 George St Sydney" });
      await createSite(db, { ...BASE_SITE, name: "Site B", address: null });

      const results = await listSites(db, { search: "George" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Site A");
    } finally {
      driver.close();
    }
  });

  it("bbox filter returns only rows within the bounding box", async () => {
    const { driver, db } = await setup();
    try {
      // Sydney and Melbourne are ~713 km apart
      await createSite(db, { ...BASE_SITE, name: "Sydney", latitude: -33.87, longitude: 151.21 });
      await createSite(db, {
        ...BASE_SITE,
        name: "Melbourne",
        latitude: -37.81,
        longitude: 144.96,
      });

      // Bounding box that covers only Sydney
      const results = await listSites(db, {
        bbox: { minLat: -35, maxLat: -32, minLng: 149, maxLng: 153 },
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Sydney");
    } finally {
      driver.close();
    }
  });

  it("limit and offset paginate results", async () => {
    const { driver, db } = await setup();
    try {
      for (let i = 0; i < 10; i++) {
        await createSite(db, { ...BASE_SITE, name: `Site ${i}` });
      }

      const page1 = await listSites(db, { limit: 4, offset: 0 });
      const page2 = await listSites(db, { limit: 4, offset: 4 });
      const page3 = await listSites(db, { limit: 4, offset: 8 });

      expect(page1).toHaveLength(4);
      expect(page2).toHaveLength(4);
      expect(page3).toHaveLength(2);

      const allIds = [...page1, ...page2, ...page3].map((s) => s.id);
      expect(new Set(allIds).size).toBe(10); // no duplicates
    } finally {
      driver.close();
    }
  });

  it("combined status + type filter", async () => {
    const { driver, db } = await setup();
    try {
      await createSite(db, { ...BASE_SITE, type: "tower", status: "active" });
      await createSite(db, { ...BASE_SITE, type: "tower", status: "fault" });
      await createSite(db, { ...BASE_SITE, type: "rooftop", status: "active" });

      const results = await listSites(db, { type: "tower", status: "active" });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("tower");
      expect(results[0].status).toBe("active");
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// sitesWithinRadiusKm
// ---------------------------------------------------------------------------

describe("sitesWithinRadiusKm", () => {
  it("returns sites within the radius and excludes those outside", async () => {
    const { driver, db } = await setup();
    try {
      // Sydney to Melbourne: ~714 km; Sydney to Adelaide: ~1275 km
      await createSite(db, {
        ...BASE_SITE,
        name: "Sydney",
        latitude: SYDNEY.lat,
        longitude: SYDNEY.lng,
      });
      await createSite(db, {
        ...BASE_SITE,
        name: "Melbourne",
        latitude: MELBOURNE.lat,
        longitude: MELBOURNE.lng,
      });
      await createSite(db, {
        ...BASE_SITE,
        name: "Adelaide",
        latitude: ADELAIDE.lat,
        longitude: ADELAIDE.lng,
      });

      // 900 km radius from Sydney: includes Sydney + Melbourne, excludes Adelaide
      const results = await sitesWithinRadiusKm(db, SYDNEY, 900);
      const names = results.map((s) => s.name);
      expect(names).toContain("Sydney");
      expect(names).toContain("Melbourne");
      expect(names).not.toContain("Adelaide");
    } finally {
      driver.close();
    }
  });

  it("excludes soft-deleted sites by default", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, {
        ...BASE_SITE,
        name: "Sydney",
        latitude: SYDNEY.lat,
        longitude: SYDNEY.lng,
      });
      await softDeleteSite(db, site.id);

      const results = await sitesWithinRadiusKm(db, SYDNEY, 100);
      expect(results.find((s) => s.id === site.id)).toBeUndefined();
    } finally {
      driver.close();
    }
  });

  it("includes deleted sites when includeDeleted is true", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, {
        ...BASE_SITE,
        name: "Sydney",
        latitude: SYDNEY.lat,
        longitude: SYDNEY.lng,
      });
      await softDeleteSite(db, site.id);

      const results = await sitesWithinRadiusKm(db, SYDNEY, 100, { includeDeleted: true });
      expect(results.find((s) => s.id === site.id)).toBeDefined();
    } finally {
      driver.close();
    }
  });

  it("does not return a site just outside the radius", async () => {
    const { driver, db } = await setup();
    try {
      // ~713 km from Sydney
      await createSite(db, {
        ...BASE_SITE,
        name: "Melbourne",
        latitude: MELBOURNE.lat,
        longitude: MELBOURNE.lng,
      });

      const results = await sitesWithinRadiusKm(db, SYDNEY, 700);
      expect(results.find((s) => s.name === "Melbourne")).toBeUndefined();
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// audit log coverage — all mutations
// ---------------------------------------------------------------------------

describe("audit log — all mutations write entries", () => {
  it("every mutation (create, update, softDelete, restore) writes exactly one entry", async () => {
    const { driver, db } = await setup();
    try {
      const site = await createSite(db, BASE_SITE);
      await updateSite(db, site.id, { notes: "updated" });
      await softDeleteSite(db, site.id);
      await restoreSite(db, site.id);

      const entries = await db.select().from(auditLog).where(eq(auditLog.entityId, site.id));

      expect(entries).toHaveLength(4);
      expect(entries.map((e) => e.action).sort()).toEqual(
        ["create", "restore", "soft_delete", "update"].sort(),
      );
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// upgrade-path: queries work on a DB that already has migrations applied
// ---------------------------------------------------------------------------

describe("upgrade-path", () => {
  it("queries work correctly after a second runMigrations call (simulating app restart)", async () => {
    const driver = makeTestDriver();
    try {
      // First boot — apply all migrations
      await runMigrations(driver);
      const db = makeDb(driver);

      // Write some data on first boot
      const site = await createSite(db, { ...BASE_SITE, name: "Pre-upgrade Site" });

      // Second boot — runMigrations again on the same DB (idempotent)
      await runMigrations(driver);

      // Data is still intact
      const found = await getSiteById(db, site.id);
      expect(found?.name).toBe("Pre-upgrade Site");

      // __drizzle_migrations table still has exactly 2 rows (not doubled)
      const migRows = await driver.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM __drizzle_migrations",
      );
      expect(migRows[0].count).toBe(2);

      // New mutations still work after re-migration
      await updateSite(db, site.id, { status: "maintenance" });
      const updated = await getSiteById(db, site.id);
      expect(updated?.status).toBe("maintenance");
    } finally {
      driver.close();
    }
  });

  it("works on a DB that had only migration 0000 applied (one-step upgrade)", async () => {
    const driver = makeTestDriver();
    try {
      // Manually apply only the first migration to simulate a v0.1 install
      const sql0 = await import("../../db/migrations/0000_keen_cyclops.sql?raw");
      const statements = sql0.default
        .split("--> statement-breakpoint")
        .map((s: string) => s.trim())
        .filter(Boolean);

      await driver.execute(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      for (const stmt of statements) {
        await driver.execute(stmt);
      }

      // Hash the first migration the same way runMigrations does
      const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sql0.default));
      const hash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await driver.execute("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [
        hash,
        Date.now(),
      ]);

      // Now apply the remaining migration via runMigrations (should only run 0001)
      await runMigrations(driver);

      const db = makeDb(driver);

      // sites table should now exist
      const site = await createSite(db, BASE_SITE);
      expect(site.name).toBe("Test Tower");

      // Migration tracker should have exactly 2 rows
      const migRows = await driver.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM __drizzle_migrations",
      );
      expect(migRows[0].count).toBe(2);
    } finally {
      driver.close();
    }
  });
});

// ---------------------------------------------------------------------------
// performance
// ---------------------------------------------------------------------------

describe("performance", () => {
  it("listSites over 10,000 sites returns in under 100ms", async () => {
    const driver = makeTestDriver();
    try {
      await runMigrations(driver);
      const db = makeDb(driver);

      // Bulk insert with raw better-sqlite3 for speed
      const now = new Date().toISOString();
      driver.raw.exec("BEGIN");
      const stmt = driver.raw.prepare(
        `INSERT INTO sites (id, name, type, status, latitude, longitude, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (let i = 0; i < 10_000; i++) {
        stmt.run(
          `site-${String(i).padStart(6, "0")}`,
          `Site ${i}`,
          "tower",
          "active",
          -33.8688 + (i % 100) * 0.01,
          151.2093 + (i % 100) * 0.01,
          now,
          now,
        );
      }
      driver.raw.exec("COMMIT");

      const start = performance.now();
      const results = await listSites(db, { limit: 200 });
      const elapsed = performance.now() - start;

      expect(results).toHaveLength(200);
      expect(elapsed).toBeLessThan(100);
    } finally {
      driver.close();
    }
  });
});
