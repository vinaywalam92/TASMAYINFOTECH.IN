"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "./CartProvider";
import { CartSummary } from "./CartSummary";
import { CouponBox, PinBox } from "./CouponPinBox";
import { ProductImage } from "@/components/ui/ProductImage";
import { EmptyState } from "@/components/ui/Bits";
import { inr } from "@/lib/format";

export function CartPageView() {
  const { cart, loaded, busy, setQty, remove } = useCart();
  if (!loaded) return <div className="skeleton h-64 rounded-2xl" aria-busy="true" aria-label="Loading cart" />;
  if (!cart.lines.length) {
    return <EmptyState icon={<ShoppingBag className="size-8" />} title="Your cart is empty" body="Add something you like and it will show up here." action={{ href: "/store", label: "Continue shopping" }} />;
  }
  const blocked = cart.issues.length > 0 || cart.lines.some((l) => l.stock <= 0);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        {cart.issues.length ? <ul role="alert" className="mb-4 space-y-1 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-400">{cart.issues.map((i) => <li key={i}>{i}</li>)}</ul> : null}
        <ul className="space-y-4">
          {cart.lines.map((l) => (
            <li key={l.productId} className="glass flex gap-4 rounded-2xl p-4">
              <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-line/5"><ProductImage src={l.image} alt={l.name} iconKey={l.iconKey} className="p-1" /></div>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${l.slug}`} className="font-medium hover:text-electric-400">{l.name}</Link>
                <p className="text-xs text-muted">{l.brand ? `${l.brand} · ` : ""}SKU {l.sku}</p>
                <p className="mt-1 text-sm text-muted">{inr(l.unitInclPaise)} each (incl. GST)</p>
                <div className="mt-3 flex items-center justify-between">
                  <div role="group" aria-label={`Quantity for ${l.name}`} className="flex items-center rounded-lg border border-line/15">
                    <button type="button" disabled={busy} onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Decrease quantity" className="p-2"><Minus className="size-4" /></button>
                    <span className="min-w-8 text-center tabular-nums" aria-live="polite">{l.qty}</span>
                    <button type="button" disabled={busy || l.qty >= l.stock} onClick={() => setQty(l.productId, l.qty + 1)} aria-label="Increase quantity" className="p-2 disabled:opacity-40"><Plus className="size-4" /></button>
                  </div>
                  <span className="font-semibold tabular-nums">{inr(l.lineTotalPaise)}</span>
                </div>
              </div>
              <button type="button" onClick={() => remove(l.productId)} aria-label={`Remove ${l.name}`} className="self-start rounded-lg p-2 text-muted hover:text-red-400"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      </div>
      <aside className="glass h-fit space-y-5 rounded-2xl p-5 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <CouponBox />
        <PinBox />
        <CartSummary cart={cart} />
        {blocked ? (
          <button className="btn-primary w-full" disabled>Resolve cart issues to continue</button>
        ) : (
          <Link href="/checkout" className="btn-primary btn-lg w-full">Proceed to checkout</Link>
        )}
        <Link href="/store" className="block text-center text-sm text-muted hover:text-fg">Continue shopping</Link>
      </aside>
    </div>
  );
}
