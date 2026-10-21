"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import { useCart } from "./CartProvider";

export function CouponBox() {
  const { cart, applyCoupon, removeCoupon, busy } = useCart();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (cart.couponCode) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
        <span className="flex items-center gap-2"><Tag className="size-4" aria-hidden="true" /> {cart.couponCode} applied</span>
        <button type="button" onClick={() => removeCoupon()} aria-label="Remove coupon" className="p-1"><X className="size-4" /></button>
      </div>
    );
  }
  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); const r = await applyCoupon(code); setErr(r); if (!r) setCode(""); }}
      aria-label="Apply coupon"
    >
      <label htmlFor="coupon" className="label">Coupon code</label>
      <div className="flex gap-2">
        <input id="coupon" className="input uppercase" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} autoComplete="off" />
        <button className="btn-ghost" disabled={busy || !code.trim()}>Apply</button>
      </div>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
      {cart.couponError ? <p role="alert" className="field-error">{cart.couponError}</p> : null}
    </form>
  );
}

export function PinBox() {
  const { cart, setPin, busy } = useCart();
  const [pin, setPinValue] = useState(cart.pincode ?? "");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setErr(await setPin(pin)); }} aria-label="Delivery PIN code">
      <label htmlFor="cart-pin" className="label">Delivery PIN code</label>
      <div className="flex gap-2">
        <input id="cart-pin" className="input" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))} />
        <button className="btn-ghost" disabled={busy || pin.length !== 6}>Check</button>
      </div>
      {err ? <p role="alert" className="field-error">{err}</p> : null}
    </form>
  );
}
