"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import type { ProductCardData } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { priceLabel } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CompareToggle } from "@/components/compare/CompareBar";
import { ProductImage } from "@/components/ui/ProductImage";
import { Stars } from "@/components/ui/Bits";
import { toggleWishlistAction } from "@/actions/engage";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

export function StockBadge({ stock, low }: { stock: number; low: number }) {
  const out = stock <= 0;
  const few = !out && stock <= low;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", out ? "text-red-400" : few ? "text-amber-400" : "text-emerald-400")}>
      <span className={cn("size-1.5 rounded-full", out ? "bg-red-400" : few ? "bg-amber-400" : "bg-emerald-400")} aria-hidden="true" />
      {out ? "Out of stock" : few ? `Only ${stock} left` : "In stock"}
    </span>
  );
}

export function WishlistButton({ productId, name, initial, className }: { productId: string; name: string; initial: boolean; className?: string }) {
  const router = useRouter();
  const { toast } = useCart();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={async () => {
        setBusy(true);
        const r = await toggleWishlistAction(productId).catch(() => ({ ok: false as const, loginRequired: false, inWishlist: undefined }));
        setBusy(false);
        if (r.loginRequired) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        if (r.ok) {
          setOn(!!r.inWishlist);
          toast(r.inWishlist ? "Saved to your wishlist" : "Removed from your wishlist");
        } else toast("Could not update your wishlist.", "error");
      }}
      className={cn("flex size-9 items-center justify-center rounded-full border border-line/15 bg-card/70 backdrop-blur transition hover:border-pink-400/60", className)}
    >
      <Heart className={cn("size-4 transition", on ? "fill-pink-500 text-pink-500" : "text-muted")} />
    </button>
  );
}

/** Subtle 3D tilt that follows the pointer. Off for touch, coarse pointers and reduced-motion users. */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);
  const raf = useRef(0);
  useEffect(() => {
    enabled.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(raf.current);
  }, []);
  return {
    ref,
    onPointerMove(e: React.PointerEvent) {
      const el = ref.current;
      if (!el || !enabled.current || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(0)`;
      });
    },
    onPointerLeave() {
      cancelAnimationFrame(raf.current);
      if (ref.current) ref.current.style.transform = "";
    },
  };
}

export function ProductCard({ p, gstInclusive, wished = false, priority = false }: { p: ProductCardData; gstInclusive: boolean; wished?: boolean; priority?: boolean }) {
  const tilt = useTilt();
  const href = `/product/${p.slug}`;
  const inStock = p.stock > 0;
  return (
    <article className="h-full" style={{ perspective: 900 }}>
      <div
        ref={tilt.ref}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        className="glass glow-border group flex h-full flex-col rounded-2xl p-3 transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:shadow-glow"
      >
        <div className="relative overflow-hidden rounded-xl bg-line/5">
          <Link href={href} className="block aspect-square" aria-label={p.name} tabIndex={-1}>
            <ProductImage src={p.image} alt={p.name} iconKey={p.iconKey} eager={priority} className="transition duration-500 group-hover:scale-105" />
          </Link>
          <WishlistButton productId={p.id} name={p.name} initial={wished} className="absolute right-2 top-2" />
          {p.isDemo ? <span className="absolute left-2 top-2 rounded-md bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">Demo</span> : null}
        </div>

        <div className="mt-3 flex flex-1 flex-col">
          <p className="text-xs text-muted">{p.brand ?? p.category}</p>
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">
            <Link href={href} className="hover:text-electric-400">{p.name}</Link>
          </h3>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <Stars value={p.ratingAvg} count={p.ratingCount} />
            <StockBadge stock={p.stock} low={p.lowStockThreshold} />
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-bold tabular-nums">{inr(p.pricePaise)}</span>
              {p.mrpPaise ? <span className="text-xs text-muted line-through">{inr(p.mrpPaise)}</span> : null}
            </div>
            <p className="text-[11px] text-muted">{priceLabel(gstInclusive)} ({p.gstRate}% GST)</p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <AddToCartButton productId={p.id} name={p.name} inStock={inStock} size="sm" className="flex-1" />
          </div>
          <div className="mt-2 flex justify-end">
            <CompareToggle slug={p.slug} name={p.name} />
          </div>
        </div>
      </div>
    </article>
  );
}
