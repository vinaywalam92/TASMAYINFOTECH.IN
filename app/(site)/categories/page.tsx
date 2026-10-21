import type { Metadata } from "next";
import Link from "next/link";
import { safe } from "@/lib/safe";
import { topLevelCategories } from "@/lib/catalog";
import { ProductArt } from "@/components/ui/ProductArt";
import { Breadcrumbs, EmptyState } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const cats = await safe(() => topLevelCategories(), [], "categories");
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">Categories</h1>
      {cats.length === 0 ? (
        <EmptyState title="No categories yet" body="Categories will appear here once the catalogue is set up." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cats.map((c) => (
            <div key={c.id} className="glass glow-border rounded-2xl p-4">
              <Link href={`/categories/${c.slug}`} className="block">
                <div className="aspect-[4/3] rounded-xl bg-line/5 p-4"><ProductArt kind={c.iconKey} /></div>
                <h2 className="mt-3 text-lg font-semibold">{c.name}</h2>
              </Link>
              <p className="text-xs text-muted">{c.productCount} product{c.productCount === 1 ? "" : "s"}</p>
              {c.children.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {c.children.map((ch) => <li key={ch.id}><Link href={`/categories/${ch.slug}`} className="chip hover:text-fg">{ch.name}</Link></li>)}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
