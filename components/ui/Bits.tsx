import Link from "next/link";
import { Star, PackageSearch } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Star rating. Renders nothing when there are no genuine ratings (we never show fabricated ones). */
export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted", className)} aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} review${count === 1 ? "" : "s"}`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-line/30")} />
        ))}
      </span>
      <span aria-hidden="true">({count})</span>
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
  icon?: ReactNode;
}) {
  return (
    <div className="glass mx-auto flex max-w-xl flex-col items-center rounded-3xl px-6 py-14 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-electric/10 text-electric-400">
        {icon ?? <PackageSearch className="size-8" aria-hidden="true" />}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {body ? <p className="mt-2 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? (
        <Link href={action.href} className="btn-primary mt-6">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, body, className }: { eyebrow?: string; title: string; body?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
      {body ? <p className="mt-3 text-muted">{body}</p> : null}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-3">
          <div className="skeleton aspect-square w-full" />
          <div className="skeleton mt-3 h-3 w-1/3" />
          <div className="skeleton mt-2 h-4 w-full" />
          <div className="skeleton mt-4 h-6 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Breadcrumb trail with proper landmark + aria-current. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {it.href ? <Link href={it.href} className="hover:text-fg">{it.label}</Link> : <span aria-current="page" className="text-fg">{it.label}</span>}
            {i < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
