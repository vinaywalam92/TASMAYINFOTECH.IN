import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (>= 16 chars) in production");
  return "dev-only-insecure-secret-change-me";
}

/** Unguessable link token so a guest can open/download THEIR order without an account. */
export function signOrderAccess(orderNumber: string): string {
  return createHmac("sha256", secret()).update(`order-access:${orderNumber}`).digest("base64url").slice(0, 32);
}

export function verifyOrderAccess(orderNumber: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(signOrderAccess(orderNumber));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
