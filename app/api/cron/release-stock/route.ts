import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { releaseExpiredOrders } from "@/lib/orders";
import { purgeExpiredRateLimits } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Schedule every ~10 minutes. Authorization: Bearer $CRON_SECRET */
export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const released = await releaseExpiredOrders();
  await purgeExpiredRateLimits();
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.passwordReset.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } } });
  return NextResponse.json({ ok: true, releasedOrders: released });
}
