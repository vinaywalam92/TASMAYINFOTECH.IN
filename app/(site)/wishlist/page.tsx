import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cardInclude, toCard, visibleProduct } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { ProductCard } from "@/components/store/ProductCard";
import { Breadcrumbs, EmptyState } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wishlist");
  const [rows, settings] = await Promise.all([
    db.wishlistItem.findMany({ where: { userId: user.id, product: visibleProduct() }, orderBy: { createdAt: "desc" }, include: { product: { include: cardInclude } } }),
    getSettings(),
  ]);
  const gstInclusive = settings.priceDisplay === "INCL";
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <h1 className="mb-8 text-3xl font-bold">Your wishlist</h1>
      {rows.length === 0 ? (
        <EmptyState title="Nothing saved yet" body="Tap the heart on any product to save it here." action={{ href: "/store", label: "Browse the store" }} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{rows.map((r) => <ProductCard key={r.id} p={toCard(r.product)} gstInclusive={gstInclusive} wished />)}</div>
      )}
    </div>
  );
}
