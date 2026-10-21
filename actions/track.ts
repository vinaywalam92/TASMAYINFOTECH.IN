"use server";

import { buildTrackingView, verifyOrderContact, type TrackingView } from "@/lib/tracking";
import { verifyOrderAccess } from "@/lib/order-access";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export type TrackState = { view?: TrackingView; message?: string; values?: { order: string; contact: string } };

/** Guests must give the order number plus the email/mobile on the order; one generic error for any mismatch. */
export async function trackOrderAction(_prev: TrackState, fd: FormData): Promise<TrackState> {
  const order = String(fd.get("order") ?? "").trim().toUpperCase().slice(0, 40);
  const contact = String(fd.get("contact") ?? "").trim().slice(0, 120);
  const values = { order, contact };
  const ip = await getClientIp();
  const rl = await rateLimit(`track:${ip}`, 15, 600);
  if (!rl.ok) return { message: "Too many lookups. Please try again in a few minutes.", values };
  if (!order || !contact) return { message: "Enter your order number and the email or mobile used for the order.", values };

  const user = await getCurrentUser().catch(() => null);
  let ok = false;
  if (user) ok = !!(await db.order.findFirst({ where: { orderNumber: order, userId: user.id }, select: { id: true } }));
  if (!ok) ok = await verifyOrderContact(order, contact);
  const view = ok ? await buildTrackingView(order) : null;
  if (!view) return { message: "We could not find an order matching those details.", values };
  return { view, values };
}

/** Signed-link lookup (order success page / emails). */
export async function trackBySignedLink(order: string, token: string): Promise<TrackingView | null> {
  if (!verifyOrderAccess(order, token)) return null;
  return buildTrackingView(order);
}
