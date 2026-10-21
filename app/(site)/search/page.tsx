import type { Metadata } from "next";
import { parseStoreQuery } from "@/lib/catalog";
import { Listing, toParams } from "@/components/store/Listing";
import { Breadcrumbs } from "@/components/ui/Bits";

type SP = Promise<Record<string, string | string[] | undefined>>;
export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <h1 className="mb-8 text-3xl font-bold">{q ? <>Results for “{q}”</> : "Search"}</h1>
      {q ? (
        <Listing basePath="/search" query={parseStoreQuery(sp)} params={toParams(sp)} view={sp.view === "list" ? "list" : "grid"} />
      ) : (
        <p className="text-muted">Type a product name, brand, model or SKU in the search box above.</p>
      )}
    </div>
  );
}
