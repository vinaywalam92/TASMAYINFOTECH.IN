"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { SORTS } from "@/lib/catalog-sorts";
import { cn } from "@/lib/utils";

/** Sort + grid/list switch. Updates the URL, so every state is shareable and server-rendered. */
export function ListingToolbar({ total }: { total: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const view = sp.get("view") === "list" ? "list" : "grid";
  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v); else p.delete(k);
    p.delete("page");
    router.push(p.toString() ? `${path}?${p}` : path, { scroll: false });
  };
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" aria-live="polite">{total} product{total === 1 ? "" : "s"}</p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select className="input !w-auto !py-1.5" value={sp.get("sort") ?? "popular"} onChange={(e) => set("sort", e.target.value === "popular" ? null : e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <div role="group" aria-label="View" className="flex overflow-hidden rounded-lg border border-line/15">
          {([["grid", LayoutGrid, "Grid view"], ["list", List, "List view"]] as const).map(([k, Icon, label]) => (
            <button key={k} type="button" aria-pressed={view === k} aria-label={label} onClick={() => set("view", k === "grid" ? null : "list")} className={cn("px-2.5 py-2", view === k ? "bg-electric-500/20" : "hover:bg-line/10")}>
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
