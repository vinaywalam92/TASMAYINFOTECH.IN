import Link from "next/link";
import { requireStaff, can, type Permission } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

export const metadata = { title: { default: "Admin | TASMAY INFOTECH", template: "%s | Admin" }, robots: { index: false, follow: false } };

const NAV: { href: string; label: string; perm?: Permission }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders", perm: "orders:write" },
  { href: "/admin/products", label: "Products", perm: "catalog:write" },
  { href: "/admin/categories", label: "Categories", perm: "catalog:write" },
  { href: "/admin/brands", label: "Brands", perm: "catalog:write" },
  { href: "/admin/inventory", label: "Inventory", perm: "inventory:write" },
  { href: "/admin/coupons", label: "Coupons", perm: "coupons:write" },
  { href: "/admin/shipping", label: "Shipping rules", perm: "shipping:write" },
  { href: "/admin/enquiries", label: "Enquiries & quotes", perm: "enquiries:write" },
  { href: "/admin/reviews", label: "Reviews", perm: "reviews:write" },
  { href: "/admin/customers", label: "Customers & roles", perm: "customers:write" },
  { href: "/admin/settings", label: "Settings", perm: "settings:write" },
  { href: "/admin/audit", label: "Audit log", perm: "audit:read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="theme-light min-h-screen bg-surface text-fg">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="border-b border-line/15 p-4 md:border-b-0 md:border-r">
          <Link href="/admin" className="mb-1 block font-display text-lg font-bold">TASMAY Admin</Link>
          <p className="mb-4 text-xs text-muted">{user.name} · {user.role}</p>
          <nav aria-label="Admin"><ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.filter((n) => !n.perm || can(user.role, n.perm)).map((n) => <li key={n.href}><Link href={n.href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-line/10">{n.label}</Link></li>)}
          </ul></nav>
          <div className="mt-4 flex gap-3 text-sm text-muted"><Link href="/" className="hover:text-fg">View store</Link><form action={logoutAction}><button className="hover:text-fg">Sign out</button></form></div>
        </aside>
        <main id="main" className="min-w-0 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
