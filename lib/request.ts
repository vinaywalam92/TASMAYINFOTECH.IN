import { headers } from "next/headers";

/**
 * Client IP helpers. `x-forwarded-for` is only trustworthy behind a proxy you control (Vercel,
 * Cloudflare, nginx…). If you deploy without one, rate limits keyed on IP can be spoofed.
 */
function firstIp(xff: string | null, real: string | null): string {
  return xff?.split(",")[0]?.trim() || real || "unknown";
}

/** For server actions / server components. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return firstIp(h.get("x-forwarded-for"), h.get("x-real-ip"));
}
export const getIp = getClientIp;

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent")?.slice(0, 250) ?? null;
}

/** For route handlers that receive a Request. */
export function clientIpFromRequest(req: Request): string {
  return firstIp(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
}

/**
 * CSRF defence for JSON route handlers (server actions already enforce this in Next.js):
 * a state-changing request must come from our own origin.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host && o.host === host) return true;
    const configured = process.env.APP_URL ? new URL(process.env.APP_URL).host : null;
    return !!configured && o.host === configured;
  } catch {
    return false;
  }
}
