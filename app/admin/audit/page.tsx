import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function Audit() {
  await requirePermission("audit:read");
  const rows = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return (
    <div>
      <PageTitle>Audit log</PageTitle>
      <Table head={["When", "Who", "Action", "Entity", "Details"]}>
        {rows.map((r) => <tr key={r.id}><td className="px-4 py-2 whitespace-nowrap">{formatDate(r.createdAt, true)}</td><td className="px-4 py-2">{r.actor?.email ?? "system"}</td><td className="px-4 py-2 font-mono text-xs">{r.action}</td><td className="px-4 py-2 text-xs">{r.entity} {r.entityId ?? ""}</td><td className="px-4 py-2 text-xs text-muted">{r.meta ? JSON.stringify(r.meta) : ""}{r.ip ? ` · ${r.ip}` : ""}</td></tr>)}
      </Table>
    </div>
  );
}
