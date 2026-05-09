import type { SiteStatus, SiteType } from "./schema";

export type BadgeConfig = {
  label: string;
  bg: string;
  text: string;
  dot: string;
};

// Colour palette shared with map marker colours — T-010 reuses these constants.
export const STATUS_CONFIG: Record<SiteStatus, BadgeConfig> = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
  },
  planned: {
    label: "Planned",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  maintenance: {
    label: "Maintenance",
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  fault: {
    label: "Fault",
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  decommissioned: {
    label: "Decommissioned",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

export const TYPE_LABELS: Record<SiteType, string> = {
  tower: "Tower",
  rooftop: "Rooftop",
  hut: "Hut",
  mpop: "MPOP",
  exchange: "Exchange",
  customer_premise: "Customer Premise",
  other: "Other",
};
