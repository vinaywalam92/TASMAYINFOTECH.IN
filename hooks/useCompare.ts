"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "tm_compare";
const MAX = 4;
const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]"; // storage blocked (private mode etc.): compare simply does not persist
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(slugs: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Product comparison list (up to 4 product slugs), shared across the site and persisted per browser. */
export function useCompare() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const slugs = useMemo<string[]>(() => {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
    } catch {
      return [];
    }
  }, [raw]);

  const toggle = useCallback(
    (slug: string): "added" | "removed" | "full" => {
      if (slugs.includes(slug)) {
        write(slugs.filter((s) => s !== slug));
        return "removed";
      }
      if (slugs.length >= MAX) return "full";
      write([...slugs, slug]);
      return "added";
    },
    [slugs],
  );
  const clear = useCallback(() => write([]), []);
  return { slugs, toggle, clear, has: (s: string) => slugs.includes(s), max: MAX };
}
