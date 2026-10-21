"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Tag, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = { type: "product" | "category"; label: string; sub?: string; href: string };

/** Search with debounced server autocomplete, implemented as an ARIA combobox (keyboard: ↑ ↓ Enter Esc). */
export function SearchBox({ className, onNavigate, autoFocus = false }: { className?: string; onNavigate?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const j = (await r.json()) as { suggestions: Suggestion[] };
        setItems(j.suggestions ?? []);
        setActive(-1);
      } catch {
        /* aborted or offline: keep previous suggestions */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].href);
    const term = q.trim();
    if (term) go(`/search?q=${encodeURIComponent(term)}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const showList = open && q.trim().length >= 2;

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={`${id}-input`} className="sr-only">
          Search products, brands, SKU or model
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={`${id}-input`}
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search products, brands, SKU…"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          className="w-full rounded-xl border border-line/15 bg-line/5 py-2.5 pl-10 pr-10 text-sm text-fg placeholder:text-muted/80 transition focus:border-electric focus:outline-none focus:ring-2 focus:ring-electric/40"
        />
        {loading ? <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden="true" /> : null}
      </form>

      {showList ? (
        <div className="glass absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl">
          <ul id={listId} role="listbox" aria-label="Search suggestions">
            {items.map((s, i) => (
              <li key={s.href + i} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(s.href)}
                  className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm", i === active ? "bg-electric/15" : "hover:bg-line/5")}
                >
                  {s.type === "category" ? <Tag className="size-4 shrink-0 text-violet-400" aria-hidden="true" /> : <Package className="size-4 shrink-0 text-electric-400" aria-hidden="true" />}
                  <span className="min-w-0">
                    <span className="block truncate">{s.label}</span>
                    {s.sub ? <span className="block truncate text-xs text-muted">{s.sub}</span> : null}
                  </span>
                </button>
              </li>
            ))}
            {!loading && items.length === 0 ? <li className="px-4 py-3 text-sm text-muted" role="presentation">No matches yet. Press Enter to search everything.</li> : null}
          </ul>
          {q.trim() ? (
            <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="w-full border-t border-line/10 px-4 py-2.5 text-left text-xs text-electric-400 hover:bg-line/5">
              See all results for “{q.trim()}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
