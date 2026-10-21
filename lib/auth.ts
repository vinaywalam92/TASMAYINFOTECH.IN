import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE as COOKIE } from "./constants";

const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v + (process.env.AUTH_SECRET ?? "")).digest("hex");

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
/** Real hash of a throwaway value, so login does equal bcrypt work whether or not the email exists. */
export const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);

export async function createSession(userId: string) {
  const token = randomToken();
  const ua = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
  await db.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + TTL_MS), userAgent: ua },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

/** Sign a user out everywhere (password reset/change, account disabled). */
export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { passwordHash: _omit, ...user } = session.user;
  return user;
});
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

// ─── RBAC ───
export type Permission =
  | "catalog:write" | "inventory:write" | "orders:write" | "payments:confirm" | "coupons:write"
  | "enquiries:write" | "shipping:write" | "reviews:write" | "settings:write" | "customers:write"
  | "audit:read";

const STAFF_PERMS: Permission[] = ["catalog:write", "inventory:write", "orders:write", "enquiries:write", "reviews:write"];
const ADMIN_PERMS: Permission[] = [
  ...STAFF_PERMS, "payments:confirm", "coupons:write", "shipping:write", "settings:write", "customers:write", "audit:read",
];
const PERMS: Record<Role, Permission[]> = { CUSTOMER: [], STAFF: STAFF_PERMS, ADMIN: ADMIN_PERMS };

export const can = (role: Role | undefined, perm: Permission) => !!role && PERMS[role].includes(perm);

/** Use at the top of EVERY admin server action / page: server components & actions are directly reachable. */
export async function requirePermission(perm: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!can(user.role, perm)) redirect("/admin?denied=1");
  return user;
}

/** For server actions: throw instead of redirecting/rendering, so a forged call can never proceed. */
export async function assertPermission(perm: Permission) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, perm)) throw new Error("Not authorised");
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role === "CUSTOMER") redirect("/");
  return user;
}
