import { sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    at: text("at").notNull(),
    actor: text("actor").notNull().default("user"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: text("before"),
    after: text("after"),
  },
  (table) => ({
    atIdx: index("idx_audit_log_at").on(table.at),
  }),
);

export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    groundElevationM: real("ground_elevation_m"),
    address: text("address"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => ({
    deletedAtIdx: index("idx_sites_deleted_at").on(table.deletedAt),
    latLngIdx: index("idx_sites_lat_lng").on(table.latitude, table.longitude),
  }),
);

export type Meta = typeof meta.$inferSelect;
export type NewMeta = typeof meta.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
