import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/constants";
import { randomToken, sha256 } from "@/lib/auth/password";
import { getClientIp, getUserAgent } from "@/lib/request";

const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  permissions: string[];
};

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      ip: await getClientIp().catch(() => null),
      userAgent: await getUserAgent().catch(() => null),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Resolve the signed-in user for this request (deduplicated per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = await db.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: {
        user: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
    const u = session.user;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role.key,
      permissions: u.role.permissions.map((rp) => rp.permission.key),
    };
  } catch (err) {
    console.error("[auth] session lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
});
