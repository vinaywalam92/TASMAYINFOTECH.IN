import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { moderateReviewAction } from "@/actions/admin/ops";
import { Card, Flash, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Reviews" };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requirePermission("reviews:write");
  const sp = await searchParams;
  const list = await db.review.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 60, include: { product: { select: { name: true } } } });
  return (
    <div className="space-y-4">
      <PageTitle>Reviews</PageTitle><Flash sp={sp} />
      {list.map((r) => (
        <Card key={r.id}>
          <p className="text-sm"><strong>{r.rating}★</strong> {r.title} · <span className="text-muted">{r.authorName} on {r.product.name} · {r.status}{r.isDemo ? " · DEMO" : ""}{r.verifiedPurchase ? " · verified" : ""}</span></p>
          <p className="mt-1 text-sm text-muted">{r.body}</p>
          <form action={moderateReviewAction} className="mt-3 flex gap-2"><input type="hidden" name="id" value={r.id} /><button name="status" value="APPROVED" className="btn-ghost btn-sm">Approve</button><button name="status" value="REJECTED" className="btn-danger btn-sm">Reject</button></form>
        </Card>
      ))}
      {list.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : null}
    </div>
  );
}
