import Link from "next/link";
import { db } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isPaymentConfigured } from "@/lib/integrations/payments";
import { inr } from "@/lib/format";
import { Card, Flash, PageTitle } from "@/components/admin/ui";

const PAID_STATES = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const since = new Date(Date.now() - 30 * 86400_000);
  const [settings, paid30, toProcess, lowStock, newEnq, newQuotes, products, shippingRules, pendingReviews, demo] = await Promise.all([
    getSettings(),
    db.order.aggregate({ where: { status: { in: [...PAID_STATES] }, paidAt: { gte: since } }, _sum: { totalPaise: true }, _count: true }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING", "PACKED"] } } }),
    db.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 8, select: { id: true, name: true, stock: true, lowStockThreshold: true } }),
    db.contactEnquiry.count({ where: { status: "NEW" } }),
    db.bulkQuote.count({ where: { status: "NEW" } }),
    db.product.count({ where: { isActive: true, isDemo: false } }),
    db.shippingRule.count({ where: { isActive: true, isDemo: false } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.product.count({ where: { isDemo: true } }),
  ]);
  const checklist = [
    { ok: products > 0, label: "Add real products", href: "/admin/products" },
    { ok: shippingRules > 0, label: "Create at least one shipping rule (checkout is blocked without one)", href: "/admin/shipping" },
    { ok: isPaymentConfigured(), label: "Add Razorpay keys to .env (online payment)", href: "https://razorpay.com/docs/" },
    { ok: !!settings.email || !!settings.phone, label: "Add business contact details", href: "/admin/settings" },
    { ok: !!settings.gstin, label: "Add GSTIN (needed for GST tax invoices)", href: "/admin/settings" },
    { ok: Object.values(settings.policies).every((p) => p.trim()), label: "Write the five policy pages", href: "/admin/settings" },
    { ok: !!process.env.SMTP_HOST, label: "Configure SMTP (order and enquiry emails)", href: "https://nodemailer.com/smtp/" },
  ];
  return (
    <div>
      <PageTitle>Dashboard</PageTitle>
      <Flash sp={sp} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-muted">Paid orders (30 days)</p><p className="text-3xl font-bold">{paid30._count}</p></Card>
        <Card><p className="text-sm text-muted">Revenue (30 days, incl. GST)</p><p className="text-3xl font-bold">{inr(paid30._sum.totalPaise ?? 0)}</p></Card>
        <Card><p className="text-sm text-muted">Orders to process</p><p className="text-3xl font-bold">{toProcess}</p></Card>
        <Card><p className="text-sm text-muted">New enquiries / quotes</p><p className="text-3xl font-bold">{newEnq + newQuotes}</p></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Setup checklist">
          <ul className="space-y-2 text-sm">{checklist.map((c) => <li key={c.label} className="flex gap-2"><span aria-hidden="true">{c.ok ? "✅" : "⬜"}</span><span className="sr-only">{c.ok ? "Done:" : "To do:"}</span>{c.href.startsWith("/") ? <Link href={c.href} className={c.ok ? "text-muted line-through" : "underline"}>{c.label}</Link> : <span className={c.ok ? "text-muted line-through" : ""}>{c.label}</span>}</li>)}</ul>
          {demo > 0 ? <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs">{demo} demo products exist. They are hidden in production unless SHOW_DEMO_DATA=true.</p> : null}
        </Card>
        <Card title="Low stock">
          {lowStock.length ? <ul className="space-y-1.5 text-sm">{lowStock.map((p) => <li key={p.id} className="flex justify-between"><Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link><span className={p.stock === 0 ? "text-red-500" : "text-amber-500"}>{p.stock}</span></li>)}</ul> : <p className="text-sm text-muted">Nothing low on stock.</p>}
          {pendingReviews > 0 && can(user.role, "reviews:write") ? <p className="mt-4 text-sm"><Link href="/admin/reviews" className="underline">{pendingReviews} review(s) awaiting moderation</Link></p> : null}
        </Card>
      </div>
    </div>
  );
}
