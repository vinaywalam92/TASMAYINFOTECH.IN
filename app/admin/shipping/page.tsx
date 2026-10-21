import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { deleteShippingRuleAction, saveShippingRuleAction } from "@/actions/admin/ops";
import { Card, Chk, F, Flash, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Shipping rules" };

export default async function Shipping({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("shipping:write");
  const sp = await searchParams;
  const rules = await db.shippingRule.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const form = (r?: (typeof rules)[number]) => (
    <form action={saveShippingRuleAction} className="grid gap-3 sm:grid-cols-4">
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <F label="Rule name" name="name" required defaultValue={r?.name} />
      <F label="PIN prefixes" name="prefixes" defaultValue={r?.pincodePrefixes.join(", ")} hint="Comma separated, e.g. 56, 110. Blank = fallback for all PINs." className="sm:col-span-2" />
      <F label="Sort order" name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 0} />
      <F label="Delivery fee (₹)" name="fee" type="number" step="0.01" defaultValue={r ? r.feePaise / 100 : 0} />
      <F label="Free above (₹)" name="freeAbove" type="number" step="0.01" defaultValue={r?.freeAbovePaise ? r.freeAbovePaise / 100 : ""} />
      <F label="Delivery days (min)" name="etaMin" type="number" defaultValue={r?.etaMinDays ?? 2} /><F label="Delivery days (max)" name="etaMax" type="number" defaultValue={r?.etaMaxDays ?? 7} />
      <F label="Note shown to customers" name="note" defaultValue={r?.note} className="sm:col-span-2" />
      <div className="flex flex-col justify-end gap-2"><Chk name="serviceable" label="Deliverable" checked={r ? r.serviceable : true} /><Chk name="isActive" label="Active" checked={r ? r.isActive : true} /></div>
      <div className="flex items-end gap-2"><button className="btn-ghost btn-sm">Save</button></div>
    </form>
  );
  return (
    <div className="space-y-6">
      <PageTitle>Shipping rules</PageTitle><Flash sp={sp} />
      <p className="text-sm text-muted">The longest matching PIN prefix wins. Delivery days are a policy estimate shown to customers, not live courier data. Checkout is blocked for PINs no active rule covers; add a blank-prefix fallback rule to cover everywhere you deliver.</p>
      <Card title="Add rule">{form()}</Card>
      {rules.map((r) => (
        <Card key={r.id} title={`${r.name}${r.isDemo ? " · DEMO" : ""}`}>
          {form(r)}
          <form action={deleteShippingRuleAction} className="mt-3"><input type="hidden" name="id" value={r.id} /><button className="btn-danger btn-sm">Delete rule</button></form>
        </Card>
      ))}
    </div>
  );
}
