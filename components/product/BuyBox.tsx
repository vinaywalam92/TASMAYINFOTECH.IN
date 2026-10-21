"use client";

import { useState } from "react";
import { Minus, Plus, Truck } from "lucide-react";
import { AddToCartButton, BuyNowButton } from "@/components/cart/AddToCartButton";
import { MAX_CART_QTY } from "@/lib/constants";
import { inr } from "@/lib/format";
import type { DeliveryEstimateResponse } from "@/app/api/delivery/estimate/route";

export function BuyBox({ productId, name, stock, pricePaise }: { productId: string; name: string; stock: number; pricePaise: number }) {
  const max = Math.max(1, Math.min(stock, MAX_CART_QTY));
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState("");
  const [est, setEst] = useState<DeliveryEstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const inStock = stock > 0;

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`/api/delivery/estimate?pin=${encodeURIComponent(pin)}&value=${pricePaise * qty}`);
      setEst(await r.json());
    } catch {
      setEst({ status: "invalid", message: "Could not check right now. Please try again." });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {inStock ? (
        <div className="flex items-center gap-3">
          <span id="qty-l" className="text-sm text-muted">Quantity</span>
          <div role="group" aria-labelledby="qty-l" className="flex items-center rounded-xl border border-line/20">
            <button type="button" className="px-3 py-2 disabled:opacity-40" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus className="size-4" /></button>
            <output className="w-8 text-center tabular-nums" aria-live="polite">{qty}</output>
            <button type="button" className="px-3 py-2 disabled:opacity-40" aria-label="Increase quantity" disabled={qty >= max} onClick={() => setQty((q) => q + 1)}><Plus className="size-4" /></button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <AddToCartButton productId={productId} name={name} inStock={inStock} quantity={qty} size="lg" openDrawer className="flex-1 sm:flex-none" />
        <BuyNowButton productId={productId} name={name} inStock={inStock} quantity={qty} />
      </div>

      <form onSubmit={check} className="rounded-2xl border border-line/15 p-4">
        <label htmlFor="pdp-pin" className="label flex items-center gap-2"><Truck className="size-4" aria-hidden="true" /> Delivery estimate</label>
        <div className="flex gap-2">
          <input id="pdp-pin" className="input" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="Enter 6-digit PIN code" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required />
          <button className="btn-ghost" disabled={busy || pin.length !== 6}>{busy ? "Checking…" : "Check"}</button>
        </div>
        <div aria-live="polite" className="mt-2 text-sm">
          {est?.status === "ok" ? (
            <p>
              Estimated delivery <strong>{est.range}</strong>.{" "}
              <span className="text-muted">{est.feePaise === 0 ? "Free delivery." : `Delivery charge ${inr(est.feePaise)}${est.freeAbovePaise ? `, free above ${inr(est.freeAbovePaise)}` : ""}.`} Estimate based on our dispatch policy, not live courier data.</span>
            </p>
          ) : est ? <p className="text-muted">{est.message}</p> : null}
        </div>
      </form>
    </div>
  );
}
