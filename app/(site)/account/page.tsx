import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { inr, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata = { title: "My account" };

export default async function AccountHome() {
  const user = await requireUser("/account");
  const [orders, addresses] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.address.count({ where: { userId: user.id } }),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hello, {user.name.split(" ")[0]}</h1>
        <p className="text-muted">{user.email}</p>
      </div>
      <section aria-labelledby="ro">
        <div className="mb-3 flex items-center justify-between"><h2 id="ro" className="text-xl font-semibold">Recent orders</h2><Link href="/account/orders" className="text-sm text-electric-500 hover:underline">View all</Link></div>
        {orders.length ? (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.orderNumber}`} className="glass flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4 hover:border-electric-500/50">
                  <span><span className="font-mono font-semibold">{o.orderNumber}</span><span className="ml-3 text-sm text-muted">{formatDate(o.createdAt)}</span></span>
                  <span className="text-sm">{ORDER_STATUS_LABEL[o.status]} · <strong>{inr(o.totalPaise)}</strong></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted">No orders yet. <Link href="/store" className="text-electric-500 underline">Start shopping</Link></p>}
      </section>
      <p className="text-sm text-muted">{addresses} saved address{addresses === 1 ? "" : "es"}. <Link className="text-electric-500 underline" href="/account/addresses">Manage</Link></p>
    </div>
  );
}
