/**
 * Run a data-loading function and fall back to a default when it throws.
 * Used on public pages so the storefront still renders (with empty states)
 * when the database is not reachable yet, e.g. on first run.
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T, label = "data"): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[safe] failed to load ${label}:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}
