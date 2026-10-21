import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyOrderAccess } from "@/lib/order-access";
import { inr, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

export default async function OrderSuccess({ searchParams }: { searchParams: Promise<{ order?: string; t?: string }> }) {
  const { order: orderNumber = "", t } = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  const order = orderNumber ? await db.order.findUnique({ where: { orderNumber }, include: { items: true } }) : null;
  const allowed = !!order && ((user && order.userId === user.id) || verifyOrderAccess(orderNumber, t));
  if (!order || !allowed) {
    return <div className="container-x py-16"><EmptyState title="Order not found" body="This link is invalid or has expired. Use Track Order with your order number and email or phone." action={{ href: "/track-order", label: "Track an order" }} /></div>;
  }
  const paid = order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED";
  const q = `?t=${encodeURIComponent(t ?? "")}`;
  return (
    <div className="theme-light bg-surface text-fg">
      <div className="container-x max-w-2xl py-14">
        <div className="text-center">
          {paid ? <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden="true" /> : <Clock className="mx-auto size-14 text-amber-500" aria-hidden="true" />}
          <h1 className="mt-4 text-3xl font-bold">{paid ? "Thank you! Your order is confirmed" : "Payment is being confirmed"}</h1>
          <p className="mt-2 text-muted">
            {paid ? <>A confirmation has been sent to <strong>{order.email}</strong> (if email delivery is configured).</> : "We have not received confirmation from the payment gateway yet. If money was deducted, the order will be confirmed automatically and you will be emailed."}
          </p>
        </div>
        <div className="glass mt-8 rounded-2xl p-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted">Order number</dt><dd className="font-mono font-semibold">{order.orderNumber}</dd>
            <dt className="text-muted">Placed on</dt><dd>{formatDate(order.createdAt)}</dd>
            <dt className="text-muted">Total</dt><dd className="font-semibold">{inr(order.totalPaise)}</dd>
            {order.estimatedDeliveryText ? (<><dt className="text-muted">Estimated delivery</dt><dd>{order.estimatedDeliveryText}</dd></>) : null}
          </dl>
          <ul className="mt-5 divide-y divide-line/10 border-t border-line/10 text-sm">
            {order.items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.name} × {i.quantity}</span><span className="tabular-nums">{inr(i.lineTotalPaise)}</span></li>)}
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {paid ? <a className="btn-ghost" href={`/api/orders/${order.orderNumber}/invoice${q}`} target="_blank" rel="noopener">View invoice / receipt</a> : null}
          <Link className="btn-ghost" href={`/track-order?order=${encodeURIComponent(order.orderNumber)}&t=${encodeURIComponent(t ?? "")}`}>Track order</Link>
          <Link className="btn-primary" href="/store">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
