import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { setEnquiryStatusAction } from "@/actions/admin/ops";
import { formatDate } from "@/lib/format";
import { Card, Flash, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Enquiries & quotes" };

function Status({ id, table, value, options }: { id: string; table: "enq" | "quote"; value: string; options: string[] }) {
  return (
    <form action={setEnquiryStatusAction} className="flex gap-2">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="table" value={table} />
      <select name="status" defaultValue={value} className="input !w-auto !py-1" aria-label="Status">{options.map((o) => <option key={o}>{o}</option>)}</select>
      <button className="btn-ghost btn-sm">Set</button>
    </form>
  );
}

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("enquiries:write");
  const sp = await searchParams;
  const [quotes, enq] = await Promise.all([
    db.bulkQuote.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.contactEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return (
    <div className="space-y-6">
      <PageTitle>Enquiries &amp; quotes</PageTitle><Flash sp={sp} />
      <h2 className="text-lg font-semibold">Quote / bulk requests</h2>
      {quotes.map((q) => (
        <Card key={q.id}>
          <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{q.kind} · {q.name}{q.company ? ` (${q.company})` : ""}</p><span className="text-xs text-muted">{formatDate(q.createdAt, true)}</span></div>
          <p className="text-sm text-muted"><a href={`mailto:${q.email}`} className="underline">{q.email}</a> · {q.phone}{q.gstin ? ` · GSTIN ${q.gstin}` : ""}{q.deliveryCity ? ` · ${q.deliveryCity}` : ""}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{q.items}</p>
          <p className="mt-1 text-xs text-muted">{[q.quantity && `Qty: ${q.quantity}`, q.budget && `Budget: ${q.budget}`, q.timeline && `Needed: ${q.timeline}`, q.notes && `Notes: ${q.notes}`].filter(Boolean).join(" · ")}</p>
          <div className="mt-3"><Status id={q.id} table="quote" value={q.status} options={["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST"]} /></div>
        </Card>
      ))}
      {quotes.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
      <h2 className="pt-4 text-lg font-semibold">Contact messages</h2>
      {enq.map((e) => (
        <Card key={e.id}>
          <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{e.enquiryType} · {e.name}{e.company ? ` (${e.company})` : ""}</p><span className="text-xs text-muted">{formatDate(e.createdAt, true)}</span></div>
          <p className="text-sm text-muted"><a href={`mailto:${e.email}`} className="underline">{e.email}</a> · {e.phone}{e.productRef ? ` · Ref: ${e.productRef}` : ""}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{e.message}</p>
          <div className="mt-3"><Status id={e.id} table="enq" value={e.status} options={["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"]} /></div>
        </Card>
      ))}
      {enq.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
    </div>
  );
}
