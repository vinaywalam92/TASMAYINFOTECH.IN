import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { priceLabel } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CompareToggle } from "@/components/compare/CompareBar";
import { ProductImage } from "@/components/ui/ProductImage";
import { Stars } from "@/components/ui/Bits";
import { StockBadge, WishlistButton } from "./ProductCard";

/** Horizontal card for the list view. */
export function ProductRow({ p, gstInclusive, wished }: { p: ProductCardData; gstInclusive: boolean; wished: boolean }) {
  const href = `/product/${p.slug}`;
  return (
    <article className="glass flex gap-4 rounded-2xl p-3 sm:p-4">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-line/5 sm:w-40">
        <ProductImage src={p.image} alt={p.name} iconKey={p.iconKey} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs text-muted">{p.brand ?? p.category} · SKU {p.sku}{p.isDemo ? " · DEMO" : ""}</p>
        <h3 className="mt-0.5 font-medium leading-snug"><Link href={href} className="hover:text-electric-400">{p.name}</Link></h3>
        <div className="mt-1 flex flex-wrap items-center gap-3"><Stars value={p.ratingAvg} count={p.ratingCount} /><StockBadge stock={p.stock} low={p.lowStockThreshold} /></div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <div>
            <span className="text-lg font-bold tabular-nums">{inr(p.pricePaise)}</span>{" "}
            {p.mrpPaise ? <span className="text-xs text-muted line-through">{inr(p.mrpPaise)}</span> : null}
            <p className="text-[11px] text-muted">{priceLabel(gstInclusive)} ({p.gstRate}% GST)</p>
          </div>
          <div className="flex items-center gap-2">
            <CompareToggle slug={p.slug} name={p.name} />
            <WishlistButton productId={p.id} name={p.name} initial={wished} />
            <AddToCartButton productId={p.id} name={p.name} inStock={p.stock > 0} size="sm" />
          </div>
        </div>
      </div>
    </article>
  );
}
