import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveBrandAction } from "@/actions/admin/catalog";
import { Card, Chk, F, Flash, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Brands" };

export default async function Brands({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("catalog:write");
  const sp = await searchParams;
  const brands = await db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  const form = (b?: (typeof brands)[number]) => (
    <form action={saveBrandAction} className="grid gap-3 sm:grid-cols-3">
      {b ? <input type="hidden" name="id" value={b.id} /> : null}
      <F label="Name" name="name" required defaultValue={b?.name} /><F label="Slug" name="slug" defaultValue={b?.slug} /><F label="Website" name="website" defaultValue={b?.website} />
      <F label="Logo URL (https)" name="logoUrl" defaultValue={b?.logoUrl} className="sm:col-span-2" />
      <div className="flex items-end gap-4"><Chk name="isActive" label="Active" checked={b ? b.isActive : true} /><button className="btn-ghost btn-sm">Save</button></div>
    </form>
  );
  return (
    <div className="space-y-6">
      <PageTitle>Brands</PageTitle><Flash sp={sp} />
      <p className="text-sm text-muted">Only add brands you genuinely stock. Brands appear on the storefront only when they have visible products.</p>
      <Card title="Add brand">{form()}</Card>
      {brands.map((b) => <Card key={b.id} title={`${b.name} (${b._count.products} products)${b.isDemo ? " · DEMO" : ""}`}>{form(b)}</Card>)}
    </div>
  );
}
