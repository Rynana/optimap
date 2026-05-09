import type { db } from "../../db/client";
import { createSite } from "./queries";
import type { CreateSiteInput } from "./schema";

type Db = typeof db;

// Ten realistic NSW sites spread across the state for demo purposes.
export const SAMPLE_SITES: CreateSiteInput[] = [
  {
    name: "Sydney CBD Tower",
    type: "tower",
    status: "active",
    latitude: -33.8688,
    longitude: 151.2093,
    address: "Sydney CBD, NSW 2000",
    notes: "Primary backbone site for Sydney metro.",
  },
  {
    name: "Parramatta Exchange",
    type: "exchange",
    status: "active",
    latitude: -33.8148,
    longitude: 151.0002,
    address: "Parramatta, NSW 2150",
  },
  {
    name: "Penrith Hub",
    type: "hut",
    status: "active",
    latitude: -33.751,
    longitude: 150.6942,
    address: "Penrith, NSW 2750",
  },
  {
    name: "Newcastle Tower",
    type: "tower",
    status: "active",
    latitude: -32.9283,
    longitude: 151.7817,
    address: "Newcastle, NSW 2300",
  },
  {
    name: "Wollongong MPOP",
    type: "mpop",
    status: "active",
    latitude: -34.4278,
    longitude: 150.8931,
    address: "Wollongong, NSW 2500",
  },
  {
    name: "Gosford Rooftop",
    type: "rooftop",
    status: "maintenance",
    latitude: -33.4283,
    longitude: 151.3413,
    address: "Gosford, NSW 2250",
    notes: "Scheduled maintenance — back online Fri.",
  },
  {
    name: "Coffs Harbour Tower",
    type: "tower",
    status: "active",
    latitude: -30.2986,
    longitude: 153.1094,
    address: "Coffs Harbour, NSW 2450",
  },
  {
    name: "Tamworth Planned Site",
    type: "tower",
    status: "planned",
    latitude: -31.0927,
    longitude: 150.932,
    address: "Tamworth, NSW 2340",
    notes: "Council approval pending.",
  },
  {
    name: "Orange Exchange",
    type: "exchange",
    status: "active",
    latitude: -33.2843,
    longitude: 149.1,
    address: "Orange, NSW 2800",
  },
  {
    name: "Dubbo Hut",
    type: "hut",
    status: "fault",
    latitude: -32.2569,
    longitude: 148.6011,
    address: "Dubbo, NSW 2830",
    notes: "Power fault — field team dispatched.",
  },
];

export async function loadSampleData(_db: Db): Promise<void> {
  for (const site of SAMPLE_SITES) {
    await createSite(_db, site);
  }
}
