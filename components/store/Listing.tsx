import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { getFacets, listProducts, getWishedIds, type StoreQuery } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { EmptyState } from "@/components/ui/Bits";
import { ProductCard } from "./ProductCard";
import { ProductRow } from "./ProductRow";
import { Pagination, buildHref } from "./Pagination";
import { ListingToolbar } from "./ListingToolbar";

type Props = {
  basePath: string;
  query: StoreQuery;
  /** Raw URL params, preserved by filters / pagination. */
  params: URLSearchParams;
  /** Param names that are fixed by the route (e.g. brand on /brands/[slug]) and must not render as filters. */
  hideBrandFilter?: boolean;
  view: "grid" | "list";
};

function Filters({ basePath, params, facets, query, hideBrandFilter }: { basePath: string; params: URLSearchParams; facets: Awaited<ReturnType<typeof getFacets>>; query: StoreQuery; hideBrandFilter?: boolean }) {
  const hasAny = ["brand", "min", "max", "stock", "attr"].some((k) => params.has(k));
  return (
    <form action={basePath} method="get" className="space-y-6" aria-label="Filter products">
      {/* Keep the parts of the query that are not filter controls */}
      {params.get("q") ? <input type="hidden" name="q" value={params.get("q")!} /> : null}
      {params.get("sort") ? <input type="hidden" name="sort" value={params.get("sort")!} /> : null}
      {params.get("view") ? <input type="hidden" name="view" value={params.get("view")!} /> : null}
      {params.get("category") ? <input type="hidden" name="category" value={params.get("category")!} /> : null}

      <fieldset>
        <legend className="label">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <input className="input" type="number" min={0} inputMode="numeric" name="min" placeholder="Min" aria-label="Minimum price" defaultValue={query.min ?? ""} />
          <span aria-hidden="true">–</span>
          <input className="input" type="number" min={0} inputMode="numeric" name="max" placeholder="Max" aria-label="Maximum price" defaultValue={query.max ?? ""} />
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="stock" value="1" defaultChecked={query.inStock} className="size-4 accent-electric-500" /> In stock only
      </label>

      {!hideBrandFilter && facets.brands.length ? (
        <fieldset>
          <legend className="label">Brand</legend>
          <ul className="space-y-1.5">
            {facets.brands.map((b) => (
              <li key={b.slug}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="brand" value={b.slug} defaultChecked={query.brands?.includes(b.slug)} className="size-4 accent-electric-500" />
                  {b.name} <span className="text-xs text-muted">({b.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {facets.attrs.map((a) => (
        <fieldset key={a.label}>
          <legend className="label">{a.label}</legend>
          <ul className="space-y-1.5">
            {a.values.map((v) => (
              <li key={v.key}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="attr" value={v.key} defaultChecked={query.attrs?.includes(v.key)} className="size-4 accent-electric-500" />
                  {v.value} <span className="text-xs text-muted">({v.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      <div className="flex gap-2">
        <button className="btn-primary btn-sm flex-1" type="submit">Apply filters</button>
        {hasAny ? (
          <Link
            className="btn-ghost btn-sm"
            href={buildHref(basePath, params, { brand: null, min: null, max: null, stock: null, attr: null, page: null })}
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

/** Shared server-rendered listing used by Store, Category, Brand and Search pages. */
export async function Listing({ basePath, query, params, hideBrandFilter, view }: Props) {
  const user = await safe(() => getCurrentUser(), null, "user");
  const [result, facets, settings, wished] = await Promise.all([
    safe(() => listProducts(query), { total: 0, page: 1, pageSize: 24, pages: 1, products: [] }, "products"),
    safe(() => getFacets(query), { brands: [], attrs: [] }, "facets"),
    safe(() => getSettings(), null, "settings"),
    safe(() => getWishedIds(user?.id), new Set<string>(), "wishlist"),
  ]);
  const gstInclusive = (settings?.priceDisplay ?? "INCL") === "INCL";

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside>
        <details className="glass rounded-2xl p-4 lg:hidden">
          <summary className="flex cursor-pointer items-center gap-2 font-medium"><SlidersHorizontal className="size-4" aria-hidden="true" /> Filters</summary>
          <div className="mt-4"><Filters basePath={basePath} params={params} facets={facets} query={query} hideBrandFilter={hideBrandFilter} /></div>
        </details>
        <div className="glass sticky top-24 hidden rounded-2xl p-5 lg:block">
          <h2 className="mb-4 font-semibold">Filters</h2>
          <Filters basePath={basePath} params={params} facets={facets} query={query} hideBrandFilter={hideBrandFilter} />
        </div>
      </aside>

      <div>
        <ListingToolbar total={result.total} />
        {result.products.length === 0 ? (
          <EmptyState title="No products found" body="Try removing a filter or searching for something else." action={{ href: "/store", label: "Browse the store" }} />
        ) : view === "list" ? (
          <div className="space-y-3">{result.products.map((p) => <ProductRow key={p.id} p={p} gstInclusive={gstInclusive} wished={wished.has(p.id)} />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {result.products.map((p, i) => <ProductCard key={p.id} p={p} gstInclusive={gstInclusive} wished={wished.has(p.id)} priority={i < 3} />)}
          </div>
        )}
        <Pagination basePath={basePath} params={params} page={result.page} pages={result.pages} />
      </div>
    </div>
  );
}

/** Convert Next's searchParams into URLSearchParams (first value wins for scalars, repeats preserved). */
export function toParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else if (v != null) p.set(k, v);
  }
  return p;
}
