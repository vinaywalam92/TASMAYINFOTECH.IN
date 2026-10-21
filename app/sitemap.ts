import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { db } from "@/lib/db";
import { visibleProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const STATIC = [
  "", "/store", "/categories", "/brands", "/business-solutions", "/contact", "/about", "/faqs", "/delivery-time",
  "/bulk-enquiry", "/request-quote", "/shipping-policy", "/return-refund-policy", "/cancellation-policy",
  "/privacy-policy", "/terms-and-conditions",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
  try {
    const [products, categories, brands] = await Promise.all([
      db.product.findMany({ where: visibleProduct(), select: { slug: true, updatedAt: true }, take: 5000 }),
      db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
      db.brand.findMany({ where: { isActive: true, products: { some: visibleProduct() } }, select: { slug: true } }),
    ]);
    for (const c of categories) entries.push({ url: `${SITE_URL}/categories/${c.slug}`, changeFrequency: "weekly", priority: 0.7 });
    for (const b of brands) entries.push({ url: `${SITE_URL}/brands/${b.slug}`, changeFrequency: "weekly", priority: 0.5 });
    for (const p of products) entries.push({ url: `${SITE_URL}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.8 });
  } catch (err) {
    console.error("[sitemap] database unavailable, returning static URLs only:", err instanceof Error ? err.message : err);
  }
  return entries;
}
