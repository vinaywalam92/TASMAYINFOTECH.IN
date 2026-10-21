import { redirect } from "next/navigation";

/** Redirect back to an admin page with a flash message in the query string. */
export function flash(path: string, kind: "saved" | "error", msg = "1"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg.slice(0, 200))}`);
}

export const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
export const int = (fd: FormData, k: string, fallback = 0) => {
  const n = Number.parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};
/** "1299.50" rupees → 129950 paise (null when blank / invalid). */
export function paise(fd: FormData, k: string): number | null {
  const raw = String(fd.get(k) ?? "").replace(/[₹,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
