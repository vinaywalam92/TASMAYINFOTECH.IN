import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { setUserActiveAction, setUserRoleAction } from "@/actions/admin/ops";
import { formatDate } from "@/lib/format";
import { Flash, PageTitle, Table } from "@/components/admin/ui";

export const metadata = { title: "Customers & roles" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string; error?: string }> }) {
  const me = await requirePermission("customers:write");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { orders: true } } },
  });
  return (
    <div>
      <PageTitle>Customers &amp; roles</PageTitle><Flash sp={sp} />
      <p className="mb-4 text-sm text-muted">STAFF: catalogue, inventory, orders, enquiries, reviews. ADMIN: everything including payments/refunds, coupons, shipping, settings, roles and audit log. Changing a role signs that user out.</p>
      <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} className="input max-w-xs" placeholder="Search name or email" aria-label="Search users" /><button className="btn-ghost">Search</button></form>
      <Table head={["User", "Joined", "Orders", "Role", "Account"]}>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="px-4 py-3">{u.name}<br /><span className="text-xs text-muted">{u.email}</span></td><td className="px-4 py-3">{formatDate(u.createdAt)}</td><td className="px-4 py-3">{u._count.orders}</td>
            <td className="px-4 py-3">{u.id === me.id ? u.role : <form action={setUserRoleAction} className="flex gap-2"><input type="hidden" name="id" value={u.id} /><select name="role" defaultValue={u.role} className="input !w-auto !py-1" aria-label={`Role for ${u.email}`}><option>CUSTOMER</option><option>STAFF</option><option>ADMIN</option></select><button className="btn-ghost btn-sm">Set</button></form>}</td>
            <td className="px-4 py-3">{u.id === me.id ? "You" : <form action={setUserActiveAction}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={u.isActive ? "false" : "true"} /><button className="btn-ghost btn-sm">{u.isActive ? "Deactivate" : "Reactivate"}</button></form>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
