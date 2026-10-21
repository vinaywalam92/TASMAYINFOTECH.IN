import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/constants";

export function hasPermission(user: SessionUser | null, perm: PermissionKey): boolean {
  return !!user && user.permissions.includes(perm);
}

/** Pages/actions that need any signed-in customer. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  return user;
}

/**
 * Admin guard. Authorization is always re-checked on the server (middleware only checks cookie
 * presence). Unauthorised visitors get a 404 so the admin area is not advertised.
 */
export async function requirePermission(perm: PermissionKey): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!hasPermission(user, "admin.access") || !hasPermission(user, perm)) notFound();
  return user;
}

/** Same check for server actions, which must throw instead of rendering a 404. */
export async function assertPermission(perm: PermissionKey): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "admin.access") || !hasPermission(user, perm)) {
    throw new Error("Not authorised");
  }
  return user;
}

/** Only follow same-site relative redirects (prevents open-redirect abuse of ?next=). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
