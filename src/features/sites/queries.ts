import { eq, and, isNull, like, gte, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { db } from "../../db/client";
import { sites, auditLog } from "../../db/schema";
import type { Site, NewSite } from "../../db/schema";
import { haversineKm, boundingBox } from "../../lib/geo";
import type { LatLng, BBox } from "../../lib/geo";
import { CreateSiteSchema, UpdateSiteSchema } from "./schema";
import type { CreateSiteInput, UpdateSiteInput, SiteType, SiteStatus } from "./schema";

type Db = typeof db;

export type ListSitesOpts = {
  search?: string;
  status?: SiteStatus;
  type?: SiteType;
  bbox?: BBox;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
};

async function writeAudit(
  _db: Db,
  entityType: string,
  entityId: string,
  action: string,
  before: object | null,
  after: object | null,
): Promise<void> {
  await _db.insert(auditLog).values({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: "user",
    entityType,
    entityId,
    action,
    before: before !== null ? JSON.stringify(before) : null,
    after: after !== null ? JSON.stringify(after) : null,
  });
}

export async function listSites(_db: Db, opts: ListSitesOpts = {}): Promise<Site[]> {
  const { search, status, type, bbox, limit = 200, offset = 0, includeDeleted = false } = opts;

  const conditions: SQL<unknown>[] = [];

  if (!includeDeleted) {
    conditions.push(isNull(sites.deletedAt));
  }
  if (status !== undefined) {
    conditions.push(eq(sites.status, status));
  }
  if (type !== undefined) {
    conditions.push(eq(sites.type, type));
  }
  if (search !== undefined && search !== "") {
    const pattern = `%${search}%`;
    const cond = or(like(sites.name, pattern), like(sites.address, pattern));
    if (cond) conditions.push(cond);
  }
  if (bbox !== undefined) {
    conditions.push(
      gte(sites.latitude, bbox.minLat),
      lte(sites.latitude, bbox.maxLat),
      gte(sites.longitude, bbox.minLng),
      lte(sites.longitude, bbox.maxLng),
    );
  }

  return _db
    .select()
    .from(sites)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);
}

export async function getSiteById(_db: Db, id: string): Promise<Site | null> {
  const rows = await _db.select().from(sites).where(eq(sites.id, id));
  return rows[0] ?? null;
}

export async function createSite(_db: Db, input: CreateSiteInput): Promise<Site> {
  const validated = CreateSiteSchema.parse(input);
  const now = new Date().toISOString();
  const id = validated.id ?? crypto.randomUUID();

  const newSite: Site = {
    id,
    name: validated.name,
    type: validated.type,
    status: validated.status,
    latitude: validated.latitude,
    longitude: validated.longitude,
    groundElevationM: validated.groundElevationM ?? null,
    address: validated.address ?? null,
    notes: validated.notes ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await _db.insert(sites).values(newSite as NewSite);
  await writeAudit(_db, "site", id, "create", null, newSite);

  return newSite;
}

export async function updateSite(_db: Db, id: string, input: UpdateSiteInput): Promise<Site> {
  const validated = UpdateSiteSchema.parse(input);

  const existing = await getSiteById(_db, id);
  if (!existing) throw new Error(`Site not found: ${id}`);

  const now = new Date().toISOString();
  const patch: Partial<NewSite> = { updatedAt: now };

  if (validated.name !== undefined) patch.name = validated.name;
  if (validated.type !== undefined) patch.type = validated.type;
  if (validated.status !== undefined) patch.status = validated.status;
  if (validated.latitude !== undefined) patch.latitude = validated.latitude;
  if (validated.longitude !== undefined) patch.longitude = validated.longitude;
  if (validated.groundElevationM !== undefined) patch.groundElevationM = validated.groundElevationM;
  if (validated.address !== undefined) patch.address = validated.address;
  if (validated.notes !== undefined) patch.notes = validated.notes;

  await _db.update(sites).set(patch).where(eq(sites.id, id));
  await writeAudit(_db, "site", id, "update", existing, { ...existing, ...patch });

  const updated = await getSiteById(_db, id);
  return updated!;
}

export async function softDeleteSite(_db: Db, id: string): Promise<void> {
  const existing = await getSiteById(_db, id);
  if (!existing) throw new Error(`Site not found: ${id}`);

  const now = new Date().toISOString();
  await _db.update(sites).set({ deletedAt: now, updatedAt: now }).where(eq(sites.id, id));
  await writeAudit(_db, "site", id, "soft_delete", existing, null);
}

export async function restoreSite(_db: Db, id: string): Promise<void> {
  const existing = await getSiteById(_db, id);
  if (!existing) throw new Error(`Site not found: ${id}`);

  const now = new Date().toISOString();
  await _db.update(sites).set({ deletedAt: null, updatedAt: now }).where(eq(sites.id, id));
  await writeAudit(_db, "site", id, "restore", existing, { ...existing, deletedAt: null });
}

export async function sitesWithinRadiusKm(
  _db: Db,
  centre: LatLng,
  radiusKm: number,
  opts: { includeDeleted?: boolean } = {},
): Promise<Site[]> {
  const bbox = boundingBox(centre, radiusKm);
  const candidates = await listSites(_db, {
    bbox,
    limit: 50_000,
    includeDeleted: opts.includeDeleted,
  });
  return candidates.filter(
    (site) => haversineKm(centre, { lat: site.latitude, lng: site.longitude }) <= radiusKm,
  );
}
