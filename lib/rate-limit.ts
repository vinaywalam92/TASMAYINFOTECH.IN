/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * The API is async on purpose so it can be swapped for a shared store (Upstash Redis, Vercel KV…)
 * without touching call sites. In-memory state is PER SERVER INSTANCE: on serverless or
 * multi-instance deployments use a shared store, otherwise limits are only approximate.
 */
type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as { __tmBuckets?: Map<string, Bucket> };
const buckets = (g.__tmBuckets ??= new Map<string, Bucket>());

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowSec * 1000 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 10_000) await purgeExpiredRateLimits();
  return {
    ok: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    retryAfterSec: Math.max(0, Math.ceil((b.resetAt - now) / 1000)),
  };
}

export async function purgeExpiredRateLimits(): Promise<void> {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}
