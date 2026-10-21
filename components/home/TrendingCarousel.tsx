"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/store/ProductCard";

/** Native scroll-snap carousel (touch-friendly, keyboard reachable) with prev/next controls. */
export function TrendingCarousel({ products, gstInclusive, wishedIds }: { products: ProductCardData[]; gstInclusive: boolean; wishedIds: string[] }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} className="btn-ghost btn-sm" aria-label="Previous products"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => scroll(1)} className="btn-ghost btn-sm" aria-label="Next products"><ChevronRight className="size-4" /></button>
      </div>
      <ul
        ref={track}
        aria-label="Trending products"
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p, i) => (
          <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[23.5%]">
            <ProductCard p={p} gstInclusive={gstInclusive} wished={wishedIds.includes(p.id)} priority={i < 2} />
          </li>
        ))}
      </ul>
    </div>
  );
}
