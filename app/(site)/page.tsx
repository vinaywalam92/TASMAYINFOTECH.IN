import Link from "next/link";
import { ArrowRight, Building2, FileText, Percent, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { safe } from "@/lib/safe";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { activeBrands, bestSellers, getWishedIds, hideDemo, topLevelCategories, trendingProducts } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { Hero } from "@/components/home/Hero";
import { TrendingCarousel } from "@/components/home/TrendingCarousel";
import { BestSellers } from "@/components/home/BestSellers";
import { Showcase3D } from "@/components/home/Showcase3D";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { ProductArt } from "@/components/ui/ProductArt";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading, Stars } from "@/components/ui/Bits";

export const metadata = { title: "TASMAY INFOTECH | Technology. Reimagined." };

const BENEFIT_ICONS = [Sparkles, Building2, ShieldCheck, Truck, FileText, Percent];

export default async function HomePage() {
  const user = await safe(() => getCurrentUser(), null, "user");
  const now = new Date();
  const [settings, categories, trending, sellers, brands, coupons, reviews, wished] = await Promise.all([
    safe(() => getSettings(), null, "settings"),
    safe(() => topLevelCategories(), [], "categories"),
    safe(() => trendingProducts(10), [], "trending"),
    safe(() => bestSellers(16), [], "bestsellers"),
    safe(() => activeBrands(), [], "brands"),
    safe(
      () =>
        db.coupon.findMany({
          where: { isActive: true, showOnHome: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      [],
      "offers",
    ),
    safe(
      () =>
        db.review.findMany({
          where: { status: "APPROVED", ...(hideDemo() ? { isDemo: false } : {}), rating: { gte: 4 } },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { product: { select: { name: true, slug: true } } },
        }),
      [],
      "reviews",
    ),
    safe(() => getWishedIds(user?.id), new Set<string>(), "wishlist"),
  ]);

  const gstInclusive = (settings?.priceDisplay ?? "INCL") === "INCL";
  const wishedIds = [...wished];
  const benefits = settings?.benefits ?? [];

  return (
    <>
      <Hero />

      {/* B. Featured categories */}
      <section id="categories" className="container-x scroll-mt-24 py-20" aria-labelledby="cat-h">
        <Reveal>
          <SectionHeading eyebrow="Shop by category" title="Everything your workspace runs on" body="Computers, printing, storage, networking, security and office essentials." />
        </Reveal>
        {categories.length ? (
          <Reveal stagger className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} data-reveal className="glass glow-border group rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-glow">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-line/5 p-4"><ProductArt kind={c.iconKey} className="transition duration-500 group-hover:scale-110" /></div>
                <h3 className="mt-3 font-semibold">{c.name}</h3>
                <p className="text-xs text-muted">{c.productCount ? `${c.productCount} product${c.productCount === 1 ? "" : "s"}` : "Coming soon"}</p>
              </Link>
            ))}
          </Reveal>
        ) : (
          <p className="mt-8 text-muted">Categories will appear here once the catalogue is set up.</p>
        )}
        <h2 id="cat-h" className="sr-only">Categories</h2>
      </section>

      {/* C. Trending */}
      {trending.length ? (
        <section className="container-x py-16" aria-labelledby="trend-h">
          <Reveal><SectionHeading eyebrow="Trending now" title="What shoppers are viewing" /></Reveal>
          <h2 id="trend-h" className="sr-only">Trending products</h2>
          <div className="mt-8"><TrendingCarousel products={trending} gstInclusive={gstInclusive} wishedIds={wishedIds} /></div>
        </section>
      ) : null}

      {/* D. Brands: only brands that exist in the catalogue */}
      {brands.length ? (
        <section className="container-x py-16" aria-labelledby="brand-h">
          <Reveal><SectionHeading eyebrow="Brands" title="Brands in our catalogue" /></Reveal>
          <h2 id="brand-h" className="sr-only">Brands</h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {brands.map((b) => (
              <li key={b.id}>
                <Link href={`/brands/${b.slug}`} className="glass flex h-20 items-center justify-center rounded-xl px-3 text-center text-sm font-semibold transition hover:border-electric-500/60">
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* E. Best sellers */}
      {sellers.length ? (
        <section className="container-x py-16" aria-labelledby="best-h">
          <Reveal><SectionHeading eyebrow="Best sellers" title="Top picks, ranked by orders" /></Reveal>
          <h2 id="best-h" className="sr-only">Best sellers</h2>
          <div className="mt-8"><BestSellers products={sellers} gstInclusive={gstInclusive} wishedIds={wishedIds} /></div>
          <div className="mt-8 text-center"><Link href="/store" className="btn-ghost">View the full store <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
        </section>
      ) : null}

      {/* F. Interactive 3D showcase */}
      <section className="container-x py-20" aria-labelledby="show-h">
        <Reveal><SectionHeading eyebrow="3D showcase" title="Explore technology in 3D" body="Pick a category and turn it around." /></Reveal>
        <h2 id="show-h" className="sr-only">3D showcase</h2>
        <div className="mt-10"><Showcase3D /></div>
      </section>

      {/* G. Business */}
      <section className="container-x py-16" aria-labelledby="biz-h">
        <div className="glass glow-border relative overflow-hidden rounded-3xl p-8 md:p-12">
          <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
          <p className="eyebrow mb-3">For business &amp; institutions</p>
          <h2 id="biz-h" className="max-w-2xl text-3xl font-bold md:text-4xl">Procurement for offices, schools and organisations</h2>
          <p className="mt-3 max-w-2xl text-muted">Share your requirement and our team will respond with a quotation. We can help with bulk orders, recurring supplies and GST invoices.</p>
          <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            {["Bulk enquiries", "Written quotations", "GST invoice assistance"].map((t) => (
              <li key={t} className="flex items-center gap-2"><ShieldCheck className="size-4 text-cyan" aria-hidden="true" />{t}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/request-quote" className="btn-primary">Request a quote</Link>
            <Link href="/bulk-enquiry" className="btn-ghost">Bulk enquiry</Link>
            <Link href="/business-solutions" className="btn-ghost">Learn more</Link>
          </div>
        </div>
      </section>

      {/* H. Offers: real coupons only */}
      {coupons.length ? (
        <section className="container-x py-16" aria-labelledby="offer-h">
          <Reveal><SectionHeading eyebrow="Offers" title="Current offers" /></Reveal>
          <h2 id="offer-h" className="sr-only">Offers</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {coupons.map((c) => (
              <li key={c.id} className="glass rounded-2xl p-5">
                <p className="text-2xl font-bold text-gradient">{c.type === "PERCENT" ? `${c.value}% off` : `${inr(c.value)} off`}</p>
                <p className="mt-1 text-sm text-muted">{c.description ?? "Apply at checkout."}</p>
                <p className="mt-3 inline-block rounded-md border border-dashed border-electric-500/60 px-2.5 py-1 font-mono text-sm tracking-wider">{c.code}</p>
                <p className="mt-2 text-xs text-muted">
                  {c.minOrderPaise ? `Min. order ${inr(c.minOrderPaise)}. ` : ""}
                  {c.endsAt ? `Valid until ${c.endsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* I. Why choose */}
      {benefits.length ? (
        <section className="container-x py-16" aria-labelledby="why-h">
          <Reveal><SectionHeading eyebrow="Why TASMAY INFOTECH" title="Built around how you buy" /></Reveal>
          <h2 id="why-h" className="sr-only">Why choose us</h2>
          <Reveal stagger className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <div key={b.title} data-reveal className="glass rounded-2xl p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-electric-500/15 text-electric-400"><Icon className="size-5" aria-hidden="true" /></span>
                  <h3 className="mt-4 font-semibold">{b.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{b.body}</p>
                </div>
              );
            })}
          </Reveal>
        </section>
      ) : null}

      {/* K. Reviews: approved customer reviews only (demo rows hidden in production) */}
      {reviews.length ? (
        <section className="container-x py-16" aria-labelledby="rev-h">
          <Reveal><SectionHeading eyebrow="Reviews" title="What customers say" /></Reveal>
          <h2 id="rev-h" className="sr-only">Customer reviews</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="glass flex flex-col rounded-2xl p-6">
                <Stars value={r.rating} />
                {r.title ? <p className="mt-3 font-semibold">{r.title}</p> : null}
                <p className="mt-1 line-clamp-5 text-sm text-muted">{r.body}</p>
                <p className="mt-auto pt-4 text-xs text-muted">
                  {r.authorName}{r.verifiedPurchase ? " · Verified purchase" : ""}{r.isDemo ? " · DEMO REVIEW" : ""} on{" "}
                  <Link href={`/product/${r.product.slug}`} className="underline">{r.product.name}</Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* J. Newsletter */}
      <section className="container-x py-16" aria-labelledby="news-h">
        <div className="glass mx-auto max-w-3xl rounded-3xl p-8 md:p-10">
          <h2 id="news-h" className="text-2xl font-bold md:text-3xl">Stay in the loop</h2>
          <p className="mb-6 mt-2 text-muted">New arrivals and offers by email. We&apos;ll ask you to confirm your address first.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
