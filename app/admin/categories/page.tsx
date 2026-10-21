import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveCategoryAction } from "@/actions/admin/catalog";
import { Card, Chk, F, Flash, PageTitle, Sel } from "@/components/admin/ui";

export const metadata = { title: "Categories" };
const ICONS = ["", "laptops", "printers", "toner", "accessories", "storage", "networking", "cctv", "office"];

export default async function Categories({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("catalog:write");
  const sp = await searchParams;
  const cats = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const opts = [{ value: "", label: "Top level" }, ...cats.filter((c) => !c.parentId).map((c) => ({ value: c.id, label: c.name }))];
  const form = (c?: (typeof cats)[number]) => (
    <form action={saveCategoryAction} className="grid gap-3 sm:grid-cols-3">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <F label="Name" name="name" required defaultValue={c?.name} /><F label="Slug" name="slug" defaultValue={c?.slug} />
      <Sel label="Parent" name="parentId" value={c?.parentId} options={opts.filter((o) => o.value !== c?.id)} />
      <Sel label="Illustration" name="iconKey" value={c?.iconKey} options={ICONS.map((i) => ({ value: i, label: i || "None" }))} />
      <F label="Sort order" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} /><F label="Description" name="description" defaultValue={c?.description} />
      <div className="flex items-end gap-4"><Chk name="isActive" label="Active" checked={c ? c.isActive : true} /><button className="btn-ghost btn-sm">Save</button></div>
    </form>
  );
  return (
    <div className="space-y-6">
      <PageTitle>Categories</PageTitle><Flash sp={sp} />
      <Card title="Add category">{form()}</Card>
      {cats.map((c) => <Card key={c.id} title={`${c.parentId ? "↳ " : ""}${c.name} (${c._count.products} products)`}>{form(c)}</Card>)}
    </div>
  );
}
