import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getProductBySlug, getRelated, getWishedIds, stockLabel } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { inr } from "@/lib/format";
import { priceLabel } from "@/lib/pricing";
import { SITE_URL } from "@/lib/constants";
import { ProductGallery } from "@/components/product/ProductGallery";
import { BuyBox } from "@/components/product/BuyBox";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewForm } from "@/components/product/ReviewForm";
import { ProductCard, WishlistButton } from "@/components/store/ProductCard";
import { CompareToggle } from "@/components/compare/CompareBar";
import { Breadcrumbs, Stars } from "@/components/ui/Bits";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug).catch(() => null);
  if (!p) return { title: "Product not found" };
  const desc = p.description.replace(/\s+/g, " ").slice(0, 160) || `${p.name} at TASMAY INFOTECH`;
  return { title: p.name, description: desc, alternates: { canonical: `/product/${p.slug}` }, openGraph: { title: p.name, description: desc, images: p.images[0] ? [p.images[0].url] : undefined } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const user = await safe(() => getCurrentUser(), null, "user");
  const [settings, related, wished] = await Promise.all([
    safe(() => getSettings(), null, "settings"),
    safe(() => getRelated(product.id, product.categoryId, 4), [], "related"),
    safe(() => getWishedIds(user?.id), new Set<string>(), "wishlist"),
  ]);
  const gstInclusive = (settings?.priceDisplay ?? "INCL") === "INCL";
  const stock = stockLabel(product.stock, product.lowStockThreshold);
  const specs = Object.entries((product.specs ?? {}) as Record<string, unknown>).filter(([, v]) => v != null && String(v).trim());
  const iconKey = product.category.iconKey ?? null;
  const discount = product.mrpPaise && product.mrpPaise > product.pricePaise ? Math.round((1 - product.pricePaise / product.mrpPaise) * 100) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description || undefined,
    image: product.images.map((i) => i.url),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: "INR",
      price: (product.pricePaise / 100).toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg.toFixed(1), reviewCount: product.ratingCount } } : {}),
  };

  const faqs = [
    { q: "How long will delivery take?", a: "Enter your PIN code above for an estimate based on our dispatch policy. See the Delivery Time page for details.", href: "/delivery-time" },
    { q: "What is the return policy?", a: "Our return and refund terms are published on the Return & Refund Policy page.", href: "/return-refund-policy" },
    { q: "Can I get a GST invoice?", a: "A tax invoice is available from your order page after payment. For bulk or business purchases, use the Request Quote form.", href: "/request-quote" },
    ...(product.warrantyInfo ? [{ q: "What warranty applies?", a: product.warrantyInfo }] : []),
    ...(product.compatibility ? [{ q: "Is it compatible with my device?", a: product.compatibility }] : []),
  ] as { q: string; a: string; href?: string }[];

  return (
    <div className="theme-light bg-surface text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x py-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: product.category.parent?.name ?? product.category.name, href: `/categories/${product.category.parent?.slug ?? product.category.slug}` },
            ...(product.category.parent ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }] : []),
            { label: product.name },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-2">
          <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} name={product.name} iconKey={iconKey} />

          <div>
            {product.isDemo ? <p className="mb-3 inline-block rounded-md bg-amber-400 px-2 py-0.5 text-xs font-bold uppercase text-black">Demo product</p> : null}
            {product.brand ? <Link href={`/brands/${product.brand.slug}`} className="text-sm text-electric-500 hover:underline">{product.brand.name}</Link> : null}
            <h1 className="mt-1 text-3xl font-bold leading-tight">{product.name}</h1>
            <p className="mt-1 text-sm text-muted">SKU {product.sku}{product.model ? ` · Model ${product.model}` : ""}</p>
            <div className="mt-3"><Stars value={product.ratingAvg} count={product.ratingCount} /></div>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-bold tabular-nums">{inr(product.pricePaise)}</span>
              {product.mrpPaise && product.mrpPaise > product.pricePaise ? <span className="text-muted line-through">{inr(product.mrpPaise)}</span> : null}
              {discount > 0 ? <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-sm font-semibold text-emerald-600">{discount}% off</span> : null}
            </div>
            <p className="text-sm text-muted">{priceLabel(gstInclusive)} · GST {product.gstRate}%</p>
            <p className={`mt-3 text-sm font-medium ${stock.tone === "out" ? "text-red-500" : stock.tone === "low" ? "text-amber-500" : "text-emerald-600"}`}>{stock.text}</p>

            <div className="mt-6"><BuyBox productId={product.id} name={product.name} stock={product.stock} pricePaise={product.pricePaise} /></div>

            <div className="mt-5 flex items-center gap-3">
              <WishlistButton productId={product.id} name={product.name} initial={wished.has(product.id)} />
              <CompareToggle slug={product.slug} name={product.name} />
            </div>

            {product.warrantyInfo ? (
              <p className="mt-5 flex items-start gap-2 text-sm text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-electric-500" aria-hidden="true" />{product.warrantyInfo}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="text-2xl font-bold">Description</h2>
            {product.description ? (
              <div className="mt-3 space-y-3 text-muted">{product.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
            ) : <p className="mt-3 text-muted">No description has been added yet.</p>}
            {product.compatibility ? <p className="mt-4 text-sm"><strong>Compatibility:</strong> <span className="text-muted">{product.compatibility}</span></p> : null}
          </section>

          <section aria-labelledby="spec-h">
            <h2 id="spec-h" className="text-2xl font-bold">Specifications</h2>
            {specs.length ? (
              <dl className="mt-3 divide-y divide-line/10 rounded-2xl border border-line/15">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5 text-sm">
                    <dt className="text-muted">{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="mt-3 text-muted">Specifications have not been added yet.</p>}
          </section>
        </div>

        <section className="mt-14" aria-labelledby="faq-h">
          <h2 id="faq-h" className="mb-4 text-2xl font-bold">Questions</h2>
          <div className="max-w-3xl space-y-2">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-line/15 px-4 py-3">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm text-muted">{f.a} {f.href ? <Link href={f.href} className="text-electric-500 underline">Learn more</Link> : null}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="rev-h">
          <h2 id="rev-h" className="mb-4 text-2xl font-bold">Customer reviews</h2>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              {product.reviews.length ? (
                <ul className="space-y-4">
                  {product.reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-line/15 p-4">
                      <Stars value={r.rating} />
                      {r.title ? <p className="mt-2 font-semibold">{r.title}</p> : null}
                      <p className="mt-1 text-sm text-muted">{r.body}</p>
                      <p className="mt-2 text-xs text-muted">{r.authorName}{r.verifiedPurchase ? " · Verified purchase" : ""}{r.isDemo ? " · DEMO REVIEW" : ""} · {r.createdAt.toLocaleDateString("en-IN")}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted">No reviews yet.</p>}
            </div>
            <div className="rounded-2xl border border-line/15 p-5">
              <h3 className="mb-3 font-semibold">Write a review</h3>
              {user ? <ReviewForm productId={product.id} /> : <p className="text-sm text-muted"><Link className="text-electric-500 underline" href={`/login?next=/product/${product.slug}`}>Sign in</Link> to review products you have bought.</p>}
            </div>
          </div>
        </section>

        {related.length ? (
          <section className="mt-16" aria-labelledby="rel-h">
            <h2 id="rel-h" className="mb-5 text-2xl font-bold">Related products</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((p) => <ProductCard key={p.id} p={p} gstInclusive={gstInclusive} wished={wished.has(p.id)} />)}</div>
          </section>
        ) : null}

        <RecentlyViewed currentSlug={product.slug} gstInclusive={gstInclusive} />
      </div>
    </div>
  );
}
