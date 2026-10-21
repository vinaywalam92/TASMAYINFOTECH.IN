import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import { reorderAction, cancelMyOrderAction } from "@/actions/account";

export const metadata = { title: "Order details" };
type A = { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ cancelled?: string; error?: string }> }) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/account/orders/${orderNumber}`);
  const o = await db.order.findFirst({ where: { orderNumber, userId: user.id }, include: { items: true, shipments: true, events: { orderBy: { createdAt: "asc" } } } });
  if (!o) notFound();
  const ship = o.shippingAddress as unknown as A;
  const paid = !["PENDING_PAYMENT", "CANCELLED"].includes(o.status);
  const canCancel = ["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(o.status);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-mono text-2xl font-bold">{o.orderNumber}</h1><p className="text-sm text-muted">Placed {formatDate(o.createdAt, true)}</p></div>
        <span className="chip !text-fg">{ORDER_STATUS_LABEL[o.status]}</span>
      </div>
      {sp.cancelled ? <p role="status" className="msg-ok rounded-xl border px-4 py-3 text-sm">Order cancelled. Any payment will be refunded to the original method.</p> : null}
      {sp.error ? <p role="alert" className="msg-err rounded-xl border px-4 py-3 text-sm">This order can no longer be cancelled online. Please contact us.</p> : null}

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 font-semibold">Items</h2>
        <ul className="divide-y divide-line/10 text-sm">
          {o.items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.name} <span className="text-muted">× {i.quantity}</span></span><span className="tabular-nums">{inr(i.lineTotalPaise)}</span></li>)}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line/10 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(o.subtotalPaise)}</dd></div>
          {o.discountPaise ? <div className="flex justify-between"><dt className="text-muted">Discount {o.couponCode}</dt><dd>− {inr(o.discountPaise)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{o.shippingPaise ? inr(o.shippingPaise) : "Free"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">GST{o.gstInclusive ? " (included)" : ""}</dt><dd>{inr(o.taxPaise)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{inr(o.totalPaise)}</dd></div>
        </dl>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass rounded-2xl p-5 text-sm"><h2 className="mb-2 font-semibold">Shipping address</h2><p>{ship.name}<br />{ship.line1}{ship.line2 ? <>, {ship.line2}</> : null}<br />{ship.city}, {ship.state} {ship.pincode}<br />{ship.phone}</p>{o.estimatedDeliveryText ? <p className="mt-2 text-muted">Estimated delivery: {o.estimatedDeliveryText}</p> : null}</section>
        <section className="glass rounded-2xl p-5 text-sm">
          <h2 className="mb-2 font-semibold">Shipments</h2>
          {o.shipments.length ? <ul className="space-y-2">{o.shipments.map((s) => <li key={s.id}>{s.courier}{s.trackingNumber ? <> · <span className="font-mono">{s.trackingNumber}</span></> : null}{s.trackingUrl ? <> · <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-electric-500 underline">Courier tracking</a></> : null}</li>)}</ul> : <p className="text-muted">Not shipped yet.</p>}
        </section>
      </div>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 font-semibold">Order history</h2>
        <ol className="space-y-2 text-sm">{o.events.map((e) => <li key={e.id}><span className="text-muted">{formatDate(e.createdAt, true)}</span> · {ORDER_STATUS_LABEL[e.status]}{e.note ? <span className="text-muted"> ({e.note})</span> : null}</li>)}</ol>
      </section>

      <div className="flex flex-wrap gap-3">
        {paid ? <a className="btn-ghost" href={`/api/orders/${o.orderNumber}/invoice`} target="_blank" rel="noopener">Invoice / receipt</a> : null}
        <Link className="btn-ghost" href={`/track-order?order=${o.orderNumber}`}>Track</Link>
        <form action={reorderAction}><input type="hidden" name="orderNumber" value={o.orderNumber} /><button className="btn-ghost">Reorder</button></form>
        {canCancel ? <form action={cancelMyOrderAction}><input type="hidden" name="orderNumber" value={o.orderNumber} /><button className="btn-danger">Cancel order</button></form> : null}
      </div>
    </div>
  );
}
