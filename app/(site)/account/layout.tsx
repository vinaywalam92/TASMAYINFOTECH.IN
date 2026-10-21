import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

export const metadata = { robots: { index: false } };

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Profile & security" },
  { href: "/wishlist", label: "Wishlist" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (
    <div className="theme-light bg-surface text-fg">
      <div className="container-x grid gap-8 py-10 md:grid-cols-[220px_1fr]">
        <nav aria-label="Account" className="md:sticky md:top-24 md:h-fit">
          <ul className="flex gap-2 overflow-x-auto md:flex-col">
            {NAV.map((n) => <li key={n.href}><Link href={n.href} className="block whitespace-nowrap rounded-xl px-4 py-2.5 text-sm hover:bg-line/10">{n.label}</Link></li>)}
            <li>
              <form action={logoutAction}><button className="flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-muted hover:bg-line/10"><LogOut className="size-4" aria-hidden="true" />Sign out</button></form>
            </li>
          </ul>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
