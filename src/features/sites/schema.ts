import { z } from "zod";

export const SITE_TYPES = [
  "tower",
  "rooftop",
  "hut",
  "mpop",
  "exchange",
  "customer_premise",
  "other",
] as const;

export const SITE_STATUSES = [
  "planned",
  "active",
  "decommissioned",
  "maintenance",
  "fault",
] as const;

export const SiteTypeSchema = z.enum(SITE_TYPES);
export const SiteStatusSchema = z.enum(SITE_STATUSES);

export type SiteType = z.infer<typeof SiteTypeSchema>;
export type SiteStatus = z.infer<typeof SiteStatusSchema>;

// Fields provided by the caller — timestamps are managed by the query layer.
export const CreateSiteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  type: SiteTypeSchema,
  status: SiteStatusSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  groundElevationM: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// All business fields are optional for partial updates.
export const UpdateSiteSchema = CreateSiteSchema.omit({ id: true }).partial();

export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;
