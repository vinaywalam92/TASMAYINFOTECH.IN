import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/** INCL: listed prices include GST. EXCL: listed prices exclude GST (GST added at checkout). */
export type PriceDisplayMode = "INCL" | "EXCL";

/**
 * Site-wide, admin-editable configuration. Nothing business-specific is hard-coded:
 * contact details, GSTIN, hours, etc. stay empty until the owner fills them in
 * (Admin → Settings), and the public pages simply omit empty values.
 */
export type SiteSettings = {
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  mapEmbedUrl: string; // https://www.google.com/maps/embed?... URL
  gstin: string;
  sellerStateCode: string; // two-digit GST state code, enables CGST/SGST vs IGST split on invoices
  social: { facebook: string; instagram: string; linkedin: string; x: string; youtube: string };
  priceDisplay: PriceDisplayMode;
  // delivery policy
  cutoffHour: number; // orders paid before this hour (IST) can be dispatched the same working day
  handlingDays: number; // extra business days before dispatch
  workingDays: number[]; // 0=Sun … 6=Sat
  holidays: string[]; // ISO dates yyyy-mm-dd
  deliveryNotice: string; // free-text banner (delays, serviceability)
  // content
  benefits: { title: string; body: string }[];
  /** null = not decided yet; policy pages then show a clearly marked placeholder. */
  returnWindowDays: number | null;
  aboutBody: string;
  /** Owner-written policy text (blank paragraphs separate blocks, "## " starts a heading, "- " a bullet). */
  policies: Record<PolicyKey, string>;
  /** Where enquiry / quote notifications are emailed. Falls back to `email`. */
  notifyEmail: string;
};

export const POLICY_KEYS = ["shipping", "returns", "cancellation", "privacy", "terms"] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: "TASMAY INFOTECH",
  legalName: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  hours: "",
  mapEmbedUrl: "",
  gstin: "",
  sellerStateCode: "",
  social: { facebook: "", instagram: "", linkedin: "", x: "", youtube: "" },
  priceDisplay: "INCL",
  cutoffHour: 15,
  handlingDays: 1,
  workingDays: [1, 2, 3, 4, 5, 6],
  holidays: [],
  deliveryNotice: "",
  benefits: [
    {
      title: "One catalogue for IT essentials",
      body: "Computers, printing, storage, networking and office supplies, all from a single store.",
    },
    {
      title: "Built for business buyers",
      body: "Bulk enquiries, quotations and GST invoice assistance for offices and institutions.",
    },
    {
      title: "Secure online payment",
      body: "Payments are processed by a PCI-compliant gateway. Card details never touch our servers.",
    },
    {
      title: "Know where your order is",
      body: "Order status updates, courier name and tracking details, all in one place.",
    },
  ],
  returnWindowDays: null,
  aboutBody: "",
  policies: { shipping: "", returns: "", cancellation: "", privacy: "", terms: "" },
  notifyEmail: "",
};

async function loadSettings(): Promise<SiteSettings> {
  const rows = await db.siteSetting.findMany();
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;
  return {
    ...DEFAULT_SETTINGS,
    ...(stored as Partial<SiteSettings>),
    social: { ...DEFAULT_SETTINGS.social, ...((stored.social as object) ?? {}) },
    policies: { ...DEFAULT_SETTINGS.policies, ...((stored.policies as object) ?? {}) },
  };
}

export const getSettings = unstable_cache(
  async () => {
    try {
      return await loadSettings();
    } catch (err) {
      console.error("[settings] using defaults:", err instanceof Error ? err.message : err);
      return DEFAULT_SETTINGS;
    }
  },
  ["site-settings"],
  { tags: ["settings"], revalidate: 300 },
);

export async function saveSettings(patch: Partial<SiteSettings>) {
  const entries = Object.entries(patch) as [string, unknown][];
  await db.$transaction(
    entries.map(([key, value]) =>
      db.siteSetting.upsert({
        where: { key },
        update: { value: value as never },
        create: { key, value: value as never },
      }),
    ),
  );
  revalidateTag("settings");
}
