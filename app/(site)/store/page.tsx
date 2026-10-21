import type { Metadata } from "next";
import { parseStoreQuery } from "@/lib/catalog";
import { Listing, toParams } from "@/components/store/Listing";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Store", description: "Browse IT hardware, accessories and electronics." };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function StorePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const params = toParams(sp);
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Store" }]} />
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">Store</h1>
      <Listing basePath="/store" query={parseStoreQuery(sp)} params={params} view={sp.view === "list" ? "list" : "grid"} />
    </div>
  );
}
