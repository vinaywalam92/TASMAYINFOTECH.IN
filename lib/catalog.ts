import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Demo/seed rows never reach customers in production (unless SHOW_DEMO_DATA=true is set deliberately). */
export const hideDemo = () => process.env.NODE_ENV === "production" && process.env.SHOW_DEMO_DATA !== "true";

/** Demo/seed products never appear in production (unless SHOW_DEMO_DATA=true is set deliberately). */
export const visibleProduct = (): Prisma.ProductWhereInput => ({
  isActive: true,
  category: { isActive: true },
  ...(hideDemo() ? { isDemo: false } : {}),
});

export const cardInclude = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true, iconKey: true, parent: { select: { iconKey: true } } } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ProductInclude;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string | null;
  category: string;
  categorySlug: string;
  iconKey: string | null;
  image: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  gstRate: number;
  stock: number;
  lowStockThreshold: number;
  isDemo: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
};

export function toCard(p: Prisma.ProductGetPayload<{ include: typeof cardInclude }>): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    brand: p.brand?.name ?? null,
    category: p.category.name,
    categorySlug: p.category.slug,
    iconKey: p.category.iconKey ?? p.category.parent?.iconKey ?? null,
    image: p.images[0]?.url ?? null,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise && p.mrpPaise > p.pricePaise ? p.mrpPaise : null,
    gstRate: p.gstRate,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    isDemo: p.isDemo,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
  };
}

// ───────────────────────── Listing ─────────────────────────

export type StoreQuery = {
  q?: string;
  category?: string;
  brands?: string[];
  min?: number; // rupees
  max?: number; // rupees
  inStock?: boolean;
  attrs?: string[];
  sort?: string;
  page?: number;
};

export const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }> = {
  popular: { label: "Popularity", orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  "price-asc": { label: "Price: low to high", orderBy: [{ pricePaise: "asc" }] },
  "price-desc": { label: "Price: high to low", orderBy: [{ pricePaise: "desc" }] },
  name: { label: "Name A–Z", orderBy: [{ name: "asc" }] },
};

async function categoryIds(slug: string): Promise<string[] | null> {
  const c = await db.category.findUnique({ where: { slug }, select: { id: true, children: { select: { id: true } } } });
  if (!c) return null;
  return [c.id, ...c.children.map((x) => x.id)];
}

export async function buildWhere(q: StoreQuery, opts: { skipBrand?: boolean } = {}): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [visibleProduct()];
  if (q.category) {
    const ids = await categoryIds(q.category);
    and.push({ categoryId: { in: ids ?? ["__none__"] } });
  }
  if (q.q) {
    for (const term of q.q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { model: { contains: term, mode: "insensitive" } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
          { category: { name: { contains: term, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (!opts.skipBrand && q.brands?.length) and.push({ brand: { slug: { in: q.brands } } });
  if (q.min != null) and.push({ pricePaise: { gte: Math.round(q.min * 100) } });
  if (q.max != null) and.push({ pricePaise: { lte: Math.round(q.max * 100) } });
  if (q.inStock) and.push({ stock: { gt: 0 } });
  if (q.attrs?.length) and.push({ attributes: { hasEvery: q.attrs } });
  return { AND: and };
}

export async function listProducts(q: StoreQuery, pageSize = 24) {
  const where = await buildWhere(q);
  const page = Math.max(1, q.page ?? 1);
  const orderBy = (SORTS[q.sort ?? "popular"] ?? SORTS.popular).orderBy;
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: cardInclude }),
  ]);
  return { total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), products: rows.map(toCard) };
}

export async function getFacets(q: StoreQuery) {
  const baseWhere = await buildWhere({ ...q, attrs: undefined }, { skipBrand: true });
  const [brandGroups, attrRows] = await Promise.all([
    db.product.groupBy({ by: ["brandId"], where: baseWhere, _count: { _all: true } }),
    db.product.findMany({ where: baseWhere, select: { attributes: true }, take: 600 }),
  ]);
  const ids = brandGroups.map((b) => b.brandId).filter((x): x is string => !!x);
  const brands = ids.length ? await db.brand.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, name: true } }) : [];
  const brandFacet = brands
    .map((b) => ({ slug: b.slug, name: b.name, count: brandGroups.find((g) => g.brandId === b.id)?._count._all ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const map = new Map<string, Map<string, number>>();
  for (const r of attrRows) {
    for (const a of r.attributes) {
      const i = a.indexOf(": ");
      if (i < 1) continue;
      const label = a.slice(0, i);
      const m = map.get(label) ?? new Map<string, number>();
      m.set(a, (m.get(a) ?? 0) + 1);
      map.set(label, m);
    }
  }
  const attrFacets = [...map.entries()]
    .filter(([, m]) => m.size >= 2 && m.size <= 12)
    .slice(0, 6)
    .map(([label, m]) => ({
      label,
      values: [...m.entries()].map(([key, count]) => ({ key, value: key.slice(label.length + 2), count })).sort((a, b) => b.count - a.count),
    }));
  return { brands: brandFacet, attrs: attrFacets };
}

// ───────────────────────── Single product & collections ─────────────────────────

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, ...visibleProduct() },
    include: {
      brand: true,
      category: { include: { parent: { select: { name: true, slug: true } } } },
      images: { orderBy: { sortOrder: "asc" } },
      reviews: { where: { status: "APPROVED", ...(hideDemo() ? { isDemo: false } : {}) }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function getRelated(productId: string, categoryId: string, take = 4) {
  const rows = await db.product.findMany({
    where: { AND: [visibleProduct(), { categoryId, id: { not: productId } }] },
    orderBy: { soldCount: "desc" },
    take,
    include: cardInclude,
  });
  return rows.map(toCard);
}

export async function getCardsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await db.product.findMany({ where: { AND: [visibleProduct(), { slug: { in: slugs.slice(0, 12) } }] }, include: cardInclude });
  return slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean).map((r) => toCard(r!));
}

export async function getCardsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { AND: [visibleProduct(), { id: { in: ids.slice(0, 40) } }] }, include: cardInclude });
  return rows.map(toCard);
}

export async function trendingProducts(take = 10) {
  const rows = await db.product.findMany({
    where: visibleProduct(),
    orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
    take,
    include: cardInclude,
  });
  return rows.map(toCard);
}

export async function bestSellers(take = 16) {
  const rows = await db.product.findMany({ where: visibleProduct(), orderBy: [{ soldCount: "desc" }, { createdAt: "desc" }], take, include: cardInclude });
  return rows.map(toCard);
}

export async function topLevelCategories() {
  const cats = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { children: { where: { isActive: true }, select: { id: true, slug: true, name: true } } },
  });
  const counts = await db.product.groupBy({ by: ["categoryId"], where: visibleProduct(), _count: { _all: true } });
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    iconKey: c.iconKey,
    children: c.children,
    productCount: [c.id, ...c.children.map((x) => x.id)].reduce((s, id) => s + (counts.find((g) => g.categoryId === id)?._count._all ?? 0), 0),
  }));
}

export async function activeBrands() {
  const brands = await db.brand.findMany({
    where: { isActive: true, products: { some: visibleProduct() } },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name, logoUrl: b.logoUrl, count: b._count.products }));
}

export function stockLabel(stock: number, low: number): { text: string; tone: "ok" | "low" | "out" } {
  if (stock <= 0) return { text: "Out of stock", tone: "out" };
  if (stock <= low) return { text: `Only ${stock} left`, tone: "low" };
  return { text: "In stock", tone: "ok" };
}

export function parseSpecs(text: string): { specs: Record<string, string>; attributes: string[] } {
  const specs: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k && v) specs[k] = v;
  }
  return { specs, attributes: Object.entries(specs).map(([k, v]) => `${k}: ${v}`) };
}

// ───────────────────────── Query-string parsing, suggestions, navigation ─────────────────────────

type SP = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined): string[] =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | string[] | undefined): number | undefined => {
  const n = Number(one(v));
  return Number.isFinite(n) && one(v) !== undefined && n >= 0 ? n : undefined;
};

export function parseSort(v?: string): string {
  return v && v in SORTS ? v : "popular";
}

/** Turns Next's `searchParams` into a StoreQuery (all values length-capped). */
export function parseStoreQuery(sp: SP, fixed: Partial<StoreQuery> = {}): StoreQuery {
  return {
    q: one(sp.q)?.slice(0, 80),
    category: one(sp.category)?.slice(0, 80),
    brands: arr(sp.brand).slice(0, 12).map((b) => b.slice(0, 80)),
    min: num(sp.min),
    max: num(sp.max),
    inStock: one(sp.stock) === "1",
    attrs: arr(sp.attr).slice(0, 12).map((a) => a.slice(0, 120)),
    sort: parseSort(one(sp.sort)),
    page: Math.min(500, Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1)),
    ...fixed,
  };
}

export type Suggestion = { type: "product" | "category"; label: string; sub?: string; href: string };

export async function searchSuggestions(q: string): Promise<Suggestion[]> {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const contains = { contains: term, mode: "insensitive" as const };
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: {
        AND: [visibleProduct(), { OR: [{ name: contains }, { sku: contains }, { model: contains }, { brand: { name: contains } }] }],
      },
      orderBy: { soldCount: "desc" },
      take: 6,
      select: { name: true, slug: true, sku: true, brand: { select: { name: true } } },
    }),
    db.category.findMany({ where: { isActive: true, name: contains }, take: 3, select: { name: true, slug: true } }),
  ]);
  return [
    ...categories.map((c): Suggestion => ({ type: "category", label: c.name, sub: "Category", href: `/categories/${c.slug}` })),
    ...products.map((p): Suggestion => ({
      type: "product",
      label: p.name,
      sub: [p.brand?.name, p.sku].filter(Boolean).join(" · "),
      href: `/product/${p.slug}`,
    })),
  ];
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
  { revalidate: 300, tags: ["catalog"] },
);

/** Never throws: the header must render even when the DB is down or not migrated yet. */
export async function getNavSafe(): Promise<NavCategory[]> {
  try {
    return await getNavCategories();
  } catch (err) {
    console.error("[catalog] nav categories unavailable:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } },
    },
  });
}

export async function getBrandBySlug(slug: string) {
  return db.brand.findFirst({ where: { slug, isActive: true, ...(hideDemo() ? { isDemo: false } : {}) } });
}

export async function getWishedIds(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}

/** Recompute the cached rating columns from approved reviews. Call after moderation changes. */
export async function recomputeRating(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await db.product.update({
    where: { id: productId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count._all },
  });
}
