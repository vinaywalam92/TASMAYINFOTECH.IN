import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function buildHref(basePath: string, params: URLSearchParams, patch: Record<string, string | null>) {
  const p = new URLSearchParams(params);
  for (const [k, v] of Object.entries(patch)) (v == null || v === "" ? p.delete(k) : p.set(k, v));
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** Crawlable link-based pagination (no JS needed). */
export function Pagination({ basePath, params, page, pages }: { basePath: string; params: URLSearchParams; page: number; pages: number }) {
  if (pages <= 1) return null;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const href = (n: number) => buildHref(basePath, params, { page: n === 1 ? null : String(n) });
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? <Link href={href(page - 1)} rel="prev" className="btn-ghost btn-sm" aria-label="Previous page"><ChevronLeft className="size-4" /></Link> : null}
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - list[i - 1] > 1 ? <span className="text-muted" aria-hidden="true">…</span> : null}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`} className={cn("btn-sm min-w-9 rounded-lg border px-3 text-center", n === page ? "border-electric-500 bg-electric-500/20" : "border-line/15 hover:border-line/30")}>
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? <Link href={href(page + 1)} rel="next" className="btn-ghost btn-sm" aria-label="Next page"><ChevronRight className="size-4" /></Link> : null}
    </nav>
  );
}
