import "server-only";

export const HONEYPOT_FIELD = "company_website";
export const TIMESTAMP_FIELD = "_ts";
const MIN_FILL_MS = 2500;
const MAX_AGE_MS = 24 * 3600_000;

export type HumanCheck = { ok: true } | { ok: false; reason: string };

/**
 * Server-side bot checks for public forms:
 *  1. honeypot field must be empty
 *  2. a client-set timestamp proves the form was rendered by a JS-capable browser and not submitted instantly
 *  3. Cloudflare Turnstile token verified server-side when TURNSTILE_SECRET_KEY is configured
 */
export async function verifyHuman(fd: FormData, ip?: string): Promise<HumanCheck> {
  if (String(fd.get(HONEYPOT_FIELD) ?? "") !== "") return { ok: false, reason: "honeypot" };

  const ts = Number(fd.get(TIMESTAMP_FIELD));
  const age = Date.now() - ts;
  if (!Number.isFinite(ts) || age < MIN_FILL_MS || age > MAX_AGE_MS) {
    return { ok: false, reason: "timing" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) {
    const token = String(fd.get("cf-turnstile-response") ?? "");
    if (!token) return { ok: false, reason: "turnstile-missing" };
    try {
      const body = new URLSearchParams({ secret, response: token });
      if (ip && ip !== "unknown") body.set("remoteip", ip);
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as { success?: boolean };
      if (!data.success) return { ok: false, reason: "turnstile-failed" };
    } catch {
      return { ok: false, reason: "turnstile-error" };
    }
  }
  return { ok: true };
}

export const HUMAN_CHECK_MESSAGE =
  "We could not verify this submission. Please wait a moment, complete the verification and try again.";
