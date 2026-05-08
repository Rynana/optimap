import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

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

export type Meta = typeof meta.$inferSelect;
export type NewMeta = typeof meta.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
