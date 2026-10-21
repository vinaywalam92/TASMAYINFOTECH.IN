"use client";

import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import { useCompare } from "@/hooks/useCompare";
import { useCart } from "@/components/cart/CartProvider";

export function CompareToggle({ slug, name }: { slug: string; name: string }) {
  const { has, toggle, max } = useCompare();
  const { toast } = useCart();
  const on = has(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from comparison` : `Compare ${name}`}
      onClick={() => {
        if (toggle(slug) === "full") toast(`You can compare up to ${max} products at once.`, "error");
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${on ? "bg-electric/20 text-electric-400" : "text-muted hover:text-fg"}`}
    >
      <GitCompareArrows className="size-3.5" aria-hidden="true" />
      {on ? "Comparing" : "Compare"}
    </button>
  );
}

/** Sticky tray shown while at least one product is selected for comparison. */
export function CompareBar() {
  const { slugs, clear } = useCompare();
  if (slugs.length === 0) return null;
  return (
    <div className="glass fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:bottom-5" role="region" aria-label="Product comparison">
      <p className="text-sm">
        <strong>{slugs.length}</strong> product{slugs.length === 1 ? "" : "s"} selected
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={clear} className="btn-ghost btn-sm" aria-label="Clear comparison">
          <X className="size-3.5" aria-hidden="true" /> Clear
        </button>
        {slugs.length >= 2 ? (
          <Link href={`/compare?items=${encodeURIComponent(slugs.join(","))}`} className="btn-primary btn-sm">
            Compare
          </Link>
        ) : (
          <span className="text-xs text-muted">Pick one more</span>
        )}
      </div>
    </div>
  );
}
