import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";

/**
 * Editable site configuration (admin → Settings). Everything business-specific is EMPTY by default:
 * we never invent phone numbers, addresses, certifications or statistics.
 */
export const SITE_DEFAULTS = {
  companyName: "TASMAY INFOTECH",
  address: "",
  phone: "",
  email: "",
  whatsapp: "",
  hours: "",
  mapEmbedUrl: "",
  gstin: "",
  sellerState: "",
  pricesIncludeGst: true,
  dispatchNote: "",
  holidayNote: "",
  delayNotice: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  x: "",
  youtube: "",
} as const;

export type SiteSettings = { -readonly [K in keyof typeof SITE_DEFAULTS]: (typeof SITE_DEFAULTS)[K] extends boolean ? boolean : string };

export const getSite = unstable_cache(
  async (): Promise<SiteSettings> => {
    const row = await db.siteSetting.findUnique({ where: { key: "site" } });
    return { ...SITE_DEFAULTS, ...((row?.value as object) ?? {}) } as SiteSettings;
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site"] },
);

/** Never throws — pages must render even when the DB is down or unconfigured. */
export async function getSiteSafe(): Promise<SiteSettings> {
  try {
    return await getSite();
  } catch {
    return { ...SITE_DEFAULTS } as SiteSettings;
  }
}

export type NavCategory = { slug: string; name: string; iconKey: string | null; children: { slug: string; name: string }[] };

export const getNavCategories = unstable_cache(
  async (): Promise<NavCategory[]> => {
    const cats = await db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } } },
    });
    return cats.map((c) => ({ slug: c.slug, name: c.name, iconKey: c.iconKey, children: c.children }));
  },
  ["nav-categories"],
  { revalidate: 300, tags: ["nav"] },
);

export async function getNavSafe(): Promise<NavCategory[]> {
  try {
    return await getNavCategories();
  } catch {
    return [];
  }
}
