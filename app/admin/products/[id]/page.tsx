import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveProductAction, adjustStockAction } from "@/actions/admin/catalog";
import { Card, Chk, F, Flash, PageTitle, Sel } from "@/components/admin/ui";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("catalog:write");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [p, cats, brands] = await Promise.all([
    isNew ? null : db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!isNew && !p) notFound();
  const specs = Object.entries((p?.specs ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n");
  const rupees = (n?: number | null) => (n == null ? "" : (n / 100).toFixed(2));
  return (
    <div className="max-w-4xl">
      <PageTitle>{isNew ? "Add product" : `Edit: ${p!.name}`}</PageTitle>
      <Flash sp={sp} />
      <form action={saveProductAction} className="grid gap-4 sm:grid-cols-2">
        {p ? <input type="hidden" name="id" value={p.id} /> : null}
        <F label="Name" name="name" required defaultValue={p?.name} className="sm:col-span-2" />
        <F label="SKU" name="sku" required defaultValue={p?.sku} />
        <F label="URL slug" name="slug" defaultValue={p?.slug} hint="Leave blank to generate from the name." />
        <F label="Model" name="model" defaultValue={p?.model} />
        <Sel label="Brand" name="brandId" value={p?.brandId} options={[{ value: "", label: "No brand" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]} />
        <Sel label="Category" name="categoryId" value={p?.categoryId} options={[{ value: "", label: "Select…" }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
        <F label="Price (₹)" name="price" required type="number" step="0.01" defaultValue={rupees(p?.pricePaise)} hint="Includes or excludes GST per Settings → price display." />
        <F label="MRP (₹)" name="mrp" type="number" step="0.01" defaultValue={rupees(p?.mrpPaise)} hint="Shown struck through only if higher than price." />
        <Sel label="GST rate %" name="gstRate" value={String(p?.gstRate ?? 18)} options={[0, 5, 12, 18, 28].map((r) => ({ value: String(r), label: `${r}%` }))} />
        <F label="HSN code" name="hsnCode" defaultValue={p?.hsnCode} hint="Only enter a verified code." />
        {isNew ? <F label="Opening stock" name="stock" type="number" defaultValue={0} /> : <p className="self-end text-sm text-muted">Current stock: <strong>{p!.stock}</strong> (change below)</p>}
        <F label="Low-stock threshold" name="lowStockThreshold" type="number" defaultValue={p?.lowStockThreshold ?? 5} />
        <F label="Description" name="description" textarea rows={6} defaultValue={p?.description} className="sm:col-span-2" />
        <F label="Specifications" name="specs" textarea rows={6} defaultValue={specs} hint={'One per line as "Label: Value". Repeated labels become filters.'} className="sm:col-span-2" />
        <F label="Image URLs (https)" name="images" textarea rows={3} defaultValue={p?.images.map((i) => i.url).join("\n")} hint="One per line. First is the main image." className="sm:col-span-2" />
        <F label="Compatibility" name="compatibility" defaultValue={p?.compatibility} />
        <F label="Warranty info" name="warrantyInfo" defaultValue={p?.warrantyInfo} hint="Only fill when verified with the supplier." />
        <div className="flex gap-6 sm:col-span-2"><Chk name="isActive" label="Visible in store" checked={p ? p.isActive : true} /><Chk name="isFeatured" label="Featured" checked={p?.isFeatured} /></div>
        <div className="sm:col-span-2"><button className="btn-primary">Save product</button></div>
      </form>
      {p ? (
        <Card title="Adjust stock" className="mt-8">
          <form action={adjustStockAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={p.id} /><input type="hidden" name="back" value={`/admin/products/${p.id}`} />
            <F label="Change (+/−)" name="delta" type="number" required className="w-32" />
            <F label="Reason" name="reason" required className="min-w-60 flex-1" placeholder="e.g. Stock received, damaged, recount" />
            <button className="btn-ghost">Apply</button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
