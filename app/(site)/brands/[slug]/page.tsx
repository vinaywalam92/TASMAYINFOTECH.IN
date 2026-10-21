import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrandBySlug, parseStoreQuery } from "@/lib/catalog";
import { Listing, toParams } from "@/components/store/Listing";
import { Breadcrumbs } from "@/components/ui/Bits";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrandBySlug(slug).catch(() => null);
  return { title: b ? b.name : "Brand" };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const brand = await getBrandBySlug(slug).catch(() => null);
  if (!brand) notFound();
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands", href: "/brands" }, { label: brand.name }]} />
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">{brand.name}</h1>
      <Listing basePath={`/brands/${slug}`} query={parseStoreQuery(sp, { brands: [slug] })} params={toParams(sp)} hideBrandFilter view={sp.view === "list" ? "list" : "grid"} />
    </div>
  );
}
