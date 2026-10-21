import { NextResponse } from "next/server";
import { getCardsBySlugs, listProducts, parseSort } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Lightweight JSON listing for interactive widgets (best sellers, recently viewed). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const slugsParam = sp.get("slugs");
  const limit = Math.min(Math.max(Number.parseInt(sp.get("limit") ?? "12", 10) || 12, 1), 24);
  try {
    if (slugsParam) {
      const slugs = slugsParam.split(",").map((s) => s.trim().slice(0, 100)).filter(Boolean).slice(0, 12);
      return NextResponse.json({ products: await getCardsBySlugs(slugs) }, { headers: { "Cache-Control": "private, max-age=30" } });
    }
    const { products } = await listProducts(
      { category: sp.get("category")?.slice(0, 80) || undefined, sort: parseSort(sp.get("sort") ?? undefined), inStock: sp.get("inStock") === "1" },
      limit,
    );
    return NextResponse.json({ products }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[api/products]", err instanceof Error ? err.message : err);
    return NextResponse.json({ products: [] });
  }
}
