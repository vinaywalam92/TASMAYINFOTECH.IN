import type { CartView } from "@/lib/cart";
import { inr } from "@/lib/format";

/** Order totals. Every figure is computed on the server (CartView); this only renders it. */
export function CartSummary({ cart }: { cart: CartView }) {
  const shipping =
    cart.shippingStatus === "ok" ? (cart.shippingPaise === 0 ? "Free" : inr(cart.shippingPaise))
    : cart.shippingStatus === "needs_pin" ? "Enter PIN code"
    : cart.shippingStatus === "unserviceable" ? "Not serviceable"
    : cart.shippingStatus === "unconfigured" ? "To be confirmed"
    : "—";
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal ({cart.count} item{cart.count === 1 ? "" : "s"})</dt><dd className="tabular-nums">{inr(cart.subtotalPaise)}</dd></div>
      {cart.discountPaise > 0 ? <div className="flex justify-between text-emerald-500"><dt>Coupon {cart.couponCode}</dt><dd className="tabular-nums">− {inr(cart.discountPaise)}</dd></div> : null}
      <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{shipping}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">GST {cart.gstInclusive ? "(included)" : ""}</dt><dd className="tabular-nums">{inr(cart.taxPaise)}</dd></div>
      <div className="flex justify-between border-t border-line/15 pt-3 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{inr(cart.totalPaise)}</dd></div>
      {cart.estimateText ? <p className="pt-1 text-xs text-muted">Estimated delivery {cart.estimateText} (policy estimate, not live courier data).</p> : null}
      {cart.shippingStatus === "ok" && cart.freeShippingRemainingPaise ? <p className="text-xs text-cyan">Add {inr(cart.freeShippingRemainingPaise)} more for free delivery.</p> : null}
      {cart.shippingLabel && cart.shippingStatus !== "ok" && cart.shippingStatus !== "needs_pin" ? <p className="text-xs text-amber-400">{cart.shippingLabel}</p> : null}
    </dl>
  );
}
