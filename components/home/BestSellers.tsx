"use client";

import { useMemo, useState } from "react";
import type { ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/store/ProductCard";
import { cn } from "@/lib/utils";

type Sort = "popular" | "price-asc" | "price-desc" | "rating";

/** Best sellers with instant client-side category filter and sort over the already-loaded set. */
export function BestSellers({ products, gstInclusive, wishedIds }: { products: ProductCardData[]; gstInclusive: boolean; wishedIds: string[] }) {
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<Sort>("popular");

  const cats = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => m.set(p.categorySlug, p.category));
    return [...m.entries()];
  }, [products]);

  const shown = useMemo(() => {
    const list = products.filter((p) => cat === "all" || p.categorySlug === cat);
    const by: Record<Sort, (a: ProductCardData, b: ProductCardData) => number> = {
      popular: (a, b) => b.soldCount - a.soldCount,
      "price-asc": (a, b) => a.pricePaise - b.pricePaise,
      "price-desc": (a, b) => b.pricePaise - a.pricePaise,
      rating: (a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount,
    };
    return [...list].sort(by[sort]);
  }, [products, cat, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {[["all", "All"] as const, ...cats].map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              aria-pressed={cat === slug}
              onClick={() => setCat(slug)}
              className={cn("chip", cat === slug && "border-electric-500 bg-electric-500/15 text-fg")}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select className="input !w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="popular">Most popular</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>
      {shown.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {shown.slice(0, 8).map((p) => (
            <ProductCard key={p.id} p={p} gstInclusive={gstInclusive} wished={wishedIds.includes(p.id)} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted">No products in this category yet.</p>
      )}
    </div>
  );
}
