import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/auth";
import { allowedNextStatuses } from "@/lib/orders";
import { inr, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import { addShipmentAction, advanceOrderAction, refundOrderAction } from "@/actions/admin/ops";
import { Card, F, Flash, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Order" };
type A = { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requirePermission("orders:write");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await db.order.findUnique({ where: { id }, include: { items: true, payments: true, shipments: true, events: { orderBy: { createdAt: "asc" } } } });
  if (!o) notFound();
  const a = o.shippingAddress as unknown as A;
  const next = allowedNextStatuses(o.status);
  const canCancel = ["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(o.status);
  const paidPayment = o.payments.find((p) => p.status === "PAID");
  return (
    <div className="max-w-4xl space-y-5">
      <PageTitle>Order <span className="font-mono">{o.orderNumber}</span></PageTitle>
      <Flash sp={sp} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Customer"><p className="text-sm">{a.name}<br />{o.email} · {o.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</p>{o.gstin ? <p className="mt-2 text-sm">GSTIN: {o.gstin}</p> : null}{o.notes ? <p className="mt-2 text-sm text-muted">Notes: {o.notes}</p> : null}</Card>
        <Card title="Payment"><p className="text-sm">Status: <strong>{ORDER_STATUS_LABEL[o.status]}</strong></p>{o.payments.map((p) => <p key={p.id} className="text-sm text-muted">{p.method} · {p.status} · {inr(p.amountPaise)}{p.gatewayMethod ? ` · ${p.gatewayMethod}` : ""}{p.refundedPaise ? ` · refunded ${inr(p.refundedPaise)}` : ""}<br />{p.providerPaymentId ?? p.providerOrderId}</p>)}</Card>
      </div>
      <Card title="Items">
        <ul className="divide-y divide-line/10 text-sm">{o.items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.name} <span className="text-muted">({i.sku}) × {i.quantity}</span></span><span>{inr(i.lineTotalPaise)}</span></li>)}</ul>
        <p className="mt-3 text-right font-bold">Total {inr(o.totalPaise)}</p>
      </Card>
      <Card title="Update status">
        {next.length || canCancel ? (
          <form action={advanceOrderAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={o.id} />
            <div><label htmlFor="next" className="label">Move to</label><select id="next" name="next" className="input">{[...next, ...(canCancel && !next.includes("CANCELLED") ? ["CANCELLED" as const] : [])].map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select></div>
            <F label="Note to customer (optional)" name="note" className="min-w-60 flex-1" />
            <button className="btn-primary">Update</button>
          </form>
        ) : <p className="text-sm text-muted">No further status changes are available.</p>}
        <p className="mt-2 text-xs text-muted">The customer is emailed on each change (if SMTP is configured). Cancelling a paid order does not refund automatically; use Refund below.</p>
      </Card>
      <Card title="Shipments">
        <ul className="mb-4 space-y-1 text-sm">{o.shipments.map((s) => <li key={s.id}>{s.courier} · {s.trackingNumber ?? "no tracking no."}{s.trackingUrl ? <> · <a className="underline" href={s.trackingUrl} target="_blank" rel="noopener noreferrer">link</a></> : null}</li>)}{o.shipments.length === 0 ? <li className="text-muted">None yet.</li> : null}</ul>
        <form action={addShipmentAction} className="grid gap-3 sm:grid-cols-3"><input type="hidden" name="orderId" value={o.id} /><F label="Courier" name="courier" required /><F label="Tracking number" name="trackingNumber" /><F label="Tracking URL (https)" name="trackingUrl" /><div><button className="btn-ghost">Add shipment</button></div></form>
      </Card>
      {can(user.role, "payments:confirm") && paidPayment ? (
        <Card title="Refund">
          <form action={refundOrderAction} className="flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={o.id} /><F label="Reason" name="reason" required className="min-w-60 flex-1" /><button className="btn-danger">Refund via Razorpay</button></form>
          <p className="mt-2 text-xs text-muted">Refunds the full captured amount to the original payment method through the gateway.</p>
        </Card>
      ) : null}
      <Card title="History"><ol className="space-y-1 text-sm">{o.events.map((e) => <li key={e.id}><span className="text-muted">{formatDate(e.createdAt, true)}</span> · {ORDER_STATUS_LABEL[e.status]}{e.note ? ` (${e.note})` : ""}</li>)}</ol></Card>
      <p className="text-sm"><a className="underline" href={`/api/orders/${o.orderNumber}/invoice`} target="_blank" rel="noopener">Open invoice / receipt</a></p>
    </div>
  );
}
