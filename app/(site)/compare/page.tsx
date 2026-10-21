import type { Metadata } from "next";
import Link from "next/link";
import { getCardsBySlugs, getProductBySlug } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { safe } from "@/lib/safe";
import { inr } from "@/lib/format";
import { priceLabel } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductImage } from "@/components/ui/ProductImage";
import { Breadcrumbs, EmptyState } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const { items } = await searchParams;
  const slugs = (items ?? "").split(",").map((s) => s.trim().slice(0, 100)).filter(Boolean).slice(0, 4);
  const cards = await safe(() => getCardsBySlugs(slugs), [], "compare");
  const details = await Promise.all(cards.map((c) => safe(() => getProductBySlug(c.slug), null, "product")));
  const settings = await safe(() => getSettings(), null, "settings");
  const gstInclusive = (settings?.priceDisplay ?? "INCL") === "INCL";

  if (cards.length < 2) {
    return (
      <div className="container-x py-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Compare" }]} />
        <EmptyState title="Pick at least two products" body="Use the Compare button on product cards to add products, then open the comparison." action={{ href: "/store", label: "Browse the store" }} />
      </div>
    );
  }

  const specMaps = details.map((d) => (d ? (d.specs as Record<string, unknown>) : {}));
  const keys = [...new Set(specMaps.flatMap((m) => Object.keys(m)))];

  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Compare" }]} />
      <h1 className="mb-6 text-3xl font-bold">Compare products</h1>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Product comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="w-36 p-4 text-left text-muted">Product</th>
              {cards.map((c) => (
                <th key={c.id} scope="col" className="p-4 text-left align-top">
                  <div className="mb-2 aspect-square w-28 overflow-hidden rounded-xl bg-line/5"><ProductImage src={c.image} alt={c.name} iconKey={c.iconKey} /></div>
                  <Link href={`/product/${c.slug}`} className="font-semibold hover:text-electric-400">{c.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/10">
            <Row label="Price">{cards.map((c) => <td key={c.id} className="p-4"><strong>{inr(c.pricePaise)}</strong><div className="text-xs text-muted">{priceLabel(gstInclusive)}</div></td>)}</Row>
            <Row label="Brand">{cards.map((c) => <td key={c.id} className="p-4">{c.brand ?? "—"}</td>)}</Row>
            <Row label="Availability">{cards.map((c) => <td key={c.id} className="p-4">{c.stock > 0 ? "In stock" : "Out of stock"}</td>)}</Row>
            <Row label="Rating">{cards.map((c) => <td key={c.id} className="p-4">{c.ratingCount ? `${c.ratingAvg.toFixed(1)} (${c.ratingCount})` : "No reviews"}</td>)}</Row>
            {keys.map((k) => <Row key={k} label={k}>{specMaps.map((m, i) => <td key={i} className="p-4">{m[k] != null ? String(m[k]) : "—"}</td>)}</Row>)}
            <Row label="">{cards.map((c) => <td key={c.id} className="p-4"><AddToCartButton productId={c.id} name={c.name} inStock={c.stock > 0} size="sm" /></td>)}</Row>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <tr><th scope="row" className="p-4 text-left font-medium text-muted">{label}</th>{children}</tr>;
}
