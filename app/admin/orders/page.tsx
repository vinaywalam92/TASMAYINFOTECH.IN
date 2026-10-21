import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { inr, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import { PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requirePermission("orders:write");
  const sp = await searchParams;
  const status = sp.status && sp.status in ORDER_STATUS_LABEL ? sp.status : undefined;
  const q = sp.q?.trim().slice(0, 60);
  const rows = await db.order.findMany({
    where: { ...(status ? { status: status as never } : {}), ...(q ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return (
    <div>
      <PageTitle>Orders</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} className="input max-w-xs" placeholder="Order no., email or phone" aria-label="Search orders" />
        <select name="status" defaultValue={status ?? ""} className="input !w-auto" aria-label="Status"><option value="">All statuses</option>{Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn-ghost">Filter</button>
      </form>
      <Table head={["Order", "Date", "Customer", "Total", "Status"]}>
        {rows.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold hover:underline">{o.orderNumber}</Link></td>
            <td className="px-4 py-3">{formatDate(o.createdAt, true)}</td><td className="px-4 py-3">{o.email}</td>
            <td className="px-4 py-3 tabular-nums">{inr(o.totalPaise)}</td><td className="px-4 py-3">{ORDER_STATUS_LABEL[o.status]}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
