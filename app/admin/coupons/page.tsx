import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveCouponAction } from "@/actions/admin/ops";
import { Card, Chk, F, Flash, PageTitle, Sel } from "@/components/admin/ui";

export const metadata = { title: "Coupons" };
const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function Coupons({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("coupons:write");
  const sp = await searchParams;
  const list = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const form = (c?: (typeof list)[number]) => (
    <form action={saveCouponAction} className="grid gap-3 sm:grid-cols-4">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <F label="Code" name="code" required defaultValue={c?.code} />
      <Sel label="Type" name="type" value={c?.type ?? "PERCENT"} options={[{ value: "PERCENT", label: "Percent" }, { value: "FLAT", label: "Flat (₹)" }]} />
      <F label="Value (% or ₹)" name="value" required type="number" step="0.01" defaultValue={c ? (c.type === "FLAT" ? c.value / 100 : c.value) : ""} />
      <F label="Min order (₹)" name="minOrder" type="number" step="0.01" defaultValue={c ? c.minOrderPaise / 100 : ""} />
      <F label="Max discount (₹)" name="maxDiscount" type="number" step="0.01" defaultValue={c?.maxDiscountPaise ? c.maxDiscountPaise / 100 : ""} />
      <F label="Starts" name="startsAt" type="date" defaultValue={iso(c?.startsAt)} /><F label="Ends" name="endsAt" type="date" defaultValue={iso(c?.endsAt)} />
      <F label="Usage limit" name="usageLimit" type="number" defaultValue={c?.usageLimit} />
      <F label="Description" name="description" defaultValue={c?.description} className="sm:col-span-2" />
      <div className="flex flex-col justify-end gap-2"><Chk name="isActive" label="Active" checked={c ? c.isActive : true} /><Chk name="showOnHome" label="Show on homepage" checked={c?.showOnHome} /></div>
      <div className="flex items-end"><button className="btn-ghost btn-sm">Save</button></div>
    </form>
  );
  return (
    <div className="space-y-6">
      <PageTitle>Coupons</PageTitle><Flash sp={sp} />
      <Card title="Create coupon">{form()}</Card>
      {list.map((c) => <Card key={c.id} title={`${c.code} · used ${c.usedCount}${c.usageLimit ? `/${c.usageLimit}` : ""}`}>{form(c)}</Card>)}
    </div>
  );
}
