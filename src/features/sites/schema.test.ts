import { describe, it, expect } from "vitest";
import { CreateSiteSchema, UpdateSiteSchema, SITE_TYPES, SITE_STATUSES } from "./schema";

const VALID_SITE = {
  name: "Sydney CBD Tower",
  type: "tower" as const,
  status: "active" as const,
  latitude: -33.8688,
  longitude: 151.2093,
};

describe("CreateSiteSchema", () => {
  it("accepts a minimal valid site", () => {
    expect(() => CreateSiteSchema.parse(VALID_SITE)).not.toThrow();
  });

  it("accepts all optional fields", () => {
    expect(() =>
      CreateSiteSchema.parse({
        ...VALID_SITE,
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        groundElevationM: 42.5,
        address: "1 George St, Sydney NSW 2000",
        notes: "Main CBD rooftop site",
      }),
    ).not.toThrow();

    expect(() =>
      CreateSiteSchema.parse({ ...VALID_SITE, groundElevationM: null, address: null, notes: null }),
    ).not.toThrow();
  });

  it("rejects an invalid type value", () => {
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, type: "skyscraper" })).toThrow();
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, type: "" })).toThrow();
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, type: "TOWER" })).toThrow();
  });

  it("rejects an invalid status value", () => {
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, status: "unknown" })).toThrow();
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, status: "Active" })).toThrow();
  });

  it("rejects latitude out of range", () => {
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, latitude: 91 })).toThrow();
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, latitude: -91 })).toThrow();
  });

  it("rejects longitude out of range", () => {
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, longitude: 181 })).toThrow();
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, longitude: -181 })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, name: "" })).toThrow();
  });

  it("rejects an invalid UUID for id", () => {
    expect(() => CreateSiteSchema.parse({ ...VALID_SITE, id: "not-a-uuid" })).toThrow();
  });

  it("accepts all defined type values", () => {
    for (const type of SITE_TYPES) {
      expect(() => CreateSiteSchema.parse({ ...VALID_SITE, type })).not.toThrow();
    }
  });

  it("accepts all defined status values", () => {
    for (const status of SITE_STATUSES) {
      expect(() => CreateSiteSchema.parse({ ...VALID_SITE, status })).not.toThrow();
    }
  });

  it("accepts boundary latitude and longitude values", () => {
    expect(() =>
      CreateSiteSchema.parse({ ...VALID_SITE, latitude: 90, longitude: 180 }),
    ).not.toThrow();
    expect(() =>
      CreateSiteSchema.parse({ ...VALID_SITE, latitude: -90, longitude: -180 }),
    ).not.toThrow();
  });
});

describe("UpdateSiteSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(() => UpdateSiteSchema.parse({})).not.toThrow();
  });

  it("accepts a partial update", () => {
    expect(() => UpdateSiteSchema.parse({ status: "maintenance" })).not.toThrow();
    expect(() => UpdateSiteSchema.parse({ name: "Renamed Tower", notes: "Updated" })).not.toThrow();
  });

  it("still enforces enum values when provided", () => {
    expect(() => UpdateSiteSchema.parse({ type: "invalid_type" })).toThrow();
    expect(() => UpdateSiteSchema.parse({ status: "broken" })).toThrow();
  });

  it("still enforces coordinate ranges when provided", () => {
    expect(() => UpdateSiteSchema.parse({ latitude: 95 })).toThrow();
    expect(() => UpdateSiteSchema.parse({ longitude: -200 })).toThrow();
  });
});
