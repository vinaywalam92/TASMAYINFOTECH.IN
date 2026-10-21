"use client";

import { useEffect, useState } from "react";
import type { ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/store/ProductCard";

const KEY = "tm_recent";

/** Remembers the last products viewed in this browser (localStorage only) and shows the others. */
export function RecentlyViewed({ currentSlug, gstInclusive }: { currentSlug: string; gstInclusive: boolean }) {
  const [items, setItems] = useState<ProductCardData[]>([]);

  useEffect(() => {
    let slugs: string[] = [];
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(v)) slugs = v.filter((s): s is string => typeof s === "string");
      localStorage.setItem(KEY, JSON.stringify([currentSlug, ...slugs.filter((s) => s !== currentSlug)].slice(0, 8)));
    } catch { /* storage unavailable */ }
    const others = slugs.filter((s) => s !== currentSlug).slice(0, 4);
    if (!others.length) return;
    const ac = new AbortController();
    fetch(`/api/products?slugs=${encodeURIComponent(others.join(","))}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setItems(d.products ?? []))
      .catch(() => {});
    return () => ac.abort();
  }, [currentSlug]);

  if (!items.length) return null;
  return (
    <section className="mt-16" aria-labelledby="rv-h">
      <h2 id="rv-h" className="mb-5 text-2xl font-bold">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} gstInclusive={gstInclusive} />)}</div>
    </section>
  );
}
