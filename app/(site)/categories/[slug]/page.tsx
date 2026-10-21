import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, parseStoreQuery } from "@/lib/catalog";
import { Listing, toParams } from "@/components/store/Listing";
import { Breadcrumbs } from "@/components/ui/Bits";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug).catch(() => null);
  return c ? { title: c.name, description: c.description ?? undefined } : { title: "Category" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategoryBySlug(slug).catch(() => null);
  if (!cat) notFound();
  const crumbs = [{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, ...(cat.parent ? [{ label: cat.parent.name, href: `/categories/${cat.parent.slug}` }] : []), { label: cat.name }];
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold md:text-4xl">{cat.name}</h1>
      {cat.description ? <p className="mt-2 max-w-2xl text-muted">{cat.description}</p> : null}
      {cat.children.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {cat.children.map((c) => <li key={c.slug}><Link href={`/categories/${c.slug}`} className="chip hover:text-fg">{c.name}</Link></li>)}
        </ul>
      ) : null}
      <div className="mt-8">
        <Listing basePath={`/categories/${slug}`} query={parseStoreQuery(sp, { category: slug })} params={toParams(sp)} view={sp.view === "list" ? "list" : "grid"} />
      </div>
    </div>
  );
}
