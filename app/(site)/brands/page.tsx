import type { Metadata } from "next";
import Link from "next/link";
import { safe } from "@/lib/safe";
import { activeBrands } from "@/lib/catalog";
import { Breadcrumbs, EmptyState } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const brands = await safe(() => activeBrands(), [], "brands");
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
      <h1 className="mb-2 text-3xl font-bold md:text-4xl">Brands</h1>
      <p className="mb-8 text-muted">Brands currently available in our catalogue.</p>
      {brands.length === 0 ? (
        <EmptyState title="No brands listed yet" body="Brands appear here as soon as products are added for them." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {brands.map((b) => (
            <li key={b.id}>
              <Link href={`/brands/${b.slug}`} className="glass glow-border flex h-28 flex-col items-center justify-center rounded-2xl text-center transition hover:-translate-y-1">
                <span className="text-lg font-semibold">{b.name}</span>
                <span className="text-xs text-muted">{b.count} product{b.count === 1 ? "" : "s"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
