import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { inr } from "@/lib/format";
import { Flash, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Products" };

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string; error?: string }> }) {
  await requirePermission("catalog:write");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const rows = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { updatedAt: "desc" }, take: 100, include: { category: { select: { name: true } }, brand: { select: { name: true } } },
  });
  return (
    <div>
      <PageTitle action={<Link href="/admin/products/new" className="btn-primary">Add product</Link>}>Products</PageTitle>
      <Flash sp={sp} />
      <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} className="input max-w-xs" placeholder="Search name or SKU" aria-label="Search products" /><button className="btn-ghost">Search</button></form>
      <Table head={["Product", "SKU", "Category", "Price", "Stock", "Status"]}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{p.isDemo ? <span className="chip ml-2">Demo</span> : null}</td>
            <td className="px-4 py-3 font-mono text-xs">{p.sku}</td><td className="px-4 py-3">{p.category.name}</td>
            <td className="px-4 py-3 tabular-nums">{inr(p.pricePaise)}</td><td className="px-4 py-3 tabular-nums">{p.stock}</td>
            <td className="px-4 py-3">{p.isActive ? "Active" : "Hidden"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
