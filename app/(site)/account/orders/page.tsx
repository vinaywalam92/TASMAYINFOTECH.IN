import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import { EmptyState } from "@/components/ui/Bits";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: user.id, status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 100, include: { items: { select: { name: true, quantity: true } } } });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your orders</h1>
      {orders.length === 0 ? <EmptyState title="No orders yet" action={{ href: "/store", label: "Start shopping" }} /> : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.orderNumber}`} className="glass block rounded-2xl p-4 hover:border-electric-500/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{o.orderNumber}</span>
                  <span className="text-sm">{ORDER_STATUS_LABEL[o.status]} · <strong>{inr(o.totalPaise)}</strong></span>
                </div>
                <p className="mt-1 text-sm text-muted">{formatDate(o.createdAt)} · {o.items.slice(0, 2).map((i) => `${i.name} × ${i.quantity}`).join(", ")}{o.items.length > 2 ? ` +${o.items.length - 2} more` : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
