import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { adjustStockAction } from "@/actions/admin/catalog";
import { formatDate } from "@/lib/format";
import { Card, Flash, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Inventory" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("inventory:write");
  const sp = await searchParams;
  const [low, ledger] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, orderBy: { stock: "asc" }, take: 30, select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true } }),
    db.inventoryAdjustment.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { product: { select: { name: true } }, actor: { select: { name: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <PageTitle>Inventory</PageTitle><Flash sp={sp} />
      <Table head={["Product", "SKU", "Stock", "Adjust"]}>
        {low.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link></td><td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
            <td className={`px-4 py-3 font-semibold tabular-nums ${p.stock <= p.lowStockThreshold ? "text-amber-500" : ""}`}>{p.stock}</td>
            <td className="px-4 py-3"><form action={adjustStockAction} className="flex gap-2"><input type="hidden" name="productId" value={p.id} /><input name="delta" type="number" required aria-label={`Change for ${p.name}`} className="input !w-20 !py-1" /><input name="reason" required aria-label="Reason" placeholder="Reason" className="input !py-1" /><button className="btn-ghost btn-sm">Apply</button></form></td>
          </tr>
        ))}
      </Table>
      <Card title="Recent adjustments (ledger)">
        <ul className="space-y-1 text-sm">{ledger.map((l) => <li key={l.id}><span className="text-muted">{formatDate(l.createdAt, true)}</span> · {l.product.name} · <strong>{l.delta > 0 ? "+" : ""}{l.delta}</strong> · {l.reason}{l.orderRef ? ` (${l.orderRef})` : ""}{l.actor ? ` · ${l.actor.name}` : ""}</li>)}</ul>
      </Card>
    </div>
  );
}
