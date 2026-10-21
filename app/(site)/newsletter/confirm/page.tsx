import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/auth";
import { EmptyState } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  let ok = false;
  if (token && token.length < 200) {
    const r = await db.newsletterSubscriber.updateMany({ where: { confirmHash: sha256(token), unsubscribedAt: null }, data: { confirmedAt: new Date(), confirmHash: null } }).catch(() => ({ count: 0 }));
    ok = r.count > 0;
  }
  return (
    <div className="container-x py-16">
      {ok ? <EmptyState title="Subscription confirmed" body="Thanks! You'll now receive our product and offer emails. You can unsubscribe at any time." action={{ href: "/store", label: "Browse the store" }} />
        : <EmptyState title="Link not valid" body="This confirmation link is invalid or already used." action={{ href: "/", label: "Back to home" }} />}
      <p className="sr-only"><Link href="/">Home</Link></p>
    </div>
  );
}
