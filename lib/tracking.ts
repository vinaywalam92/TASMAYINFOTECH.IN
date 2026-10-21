import "server-only";
import { db } from "@/lib/db";
import { ORDER_FLOW } from "@/lib/constants";
import { ORDER_STATUS_LABEL } from "@/lib/format";
import { normalizeIndianMobile } from "@/lib/validators";

export type TrackingStep = {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming";
  at: string | null; // ISO
};

export type TrackingView = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  placedAt: string;
  terminal: "CANCELLED" | "RETURNED" | null;
  steps: TrackingStep[];
  courier: { name: string; trackingNumber: string | null; trackingUrl: string | null } | null;
  estimatedDelivery: string | null;
  items: { name: string; quantity: number }[];
  latestNote: string | null;
};

const SAFE_URL = /^https:\/\/[^\s]+$/i;

export async function buildTrackingView(orderNumber: string): Promise<TrackingView | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: { select: { name: true, quantity: true } },
      events: { orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) return null;

  const firstAt = (status: string) => order.events.find((e) => e.status === status)?.createdAt ?? null;
  const currentIdx = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
  const terminal = order.status === "CANCELLED" || order.status === "RETURNED" ? order.status : null;

  // For cancelled/returned orders, show progress up to the last forward step that was reached.
  const reachedIdx = terminal
    ? Math.max(-1, ...ORDER_FLOW.map((s, i) => (order.events.some((e) => e.status === s) ? i : -1)))
    : currentIdx;

  const steps: TrackingStep[] = [
    { key: "PLACED", label: "Order placed", state: "done", at: order.createdAt.toISOString() },
    ...ORDER_FLOW.map((s, i): TrackingStep => {
      const at = firstAt(s);
      let state: TrackingStep["state"] = "upcoming";
      if (terminal) state = i <= reachedIdx ? "done" : "upcoming";
      else if (i < currentIdx) state = "done";
      else if (i === currentIdx) state = s === "DELIVERED" ? "done" : "current";
      return { key: s, label: ORDER_STATUS_LABEL[s], state, at: at ? at.toISOString() : null };
    }),
  ];
  if (terminal) {
    steps.push({ key: terminal, label: ORDER_STATUS_LABEL[terminal], state: "current", at: (firstAt(terminal) ?? order.updatedAt).toISOString() });
  }
  if (order.status === "PENDING_PAYMENT") {
    steps[1].state = "current"; // waiting for payment confirmation
  }

  const ship = order.shipments[0];
  const lastEvent = order.events[order.events.length - 1];
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    placedAt: order.createdAt.toISOString(),
    terminal,
    steps,
    courier: ship
      ? {
          name: ship.courier,
          trackingNumber: ship.trackingNumber,
          trackingUrl: ship.trackingUrl && SAFE_URL.test(ship.trackingUrl) ? ship.trackingUrl : null,
        }
      : null,
    estimatedDelivery: order.estimatedDeliveryText,
    items: order.items,
    latestNote: lastEvent?.note ?? null,
  };
}

/**
 * Guest verification: the order number AND the email or mobile on the order must both match.
 * Returns null for any mismatch (callers must give one generic error so nothing is revealed).
 */
export async function verifyOrderContact(orderNumber: string, contact: string): Promise<boolean> {
  const order = await db.order.findUnique({ where: { orderNumber }, select: { email: true, phone: true } });
  if (!order) return false;
  const c = contact.trim();
  if (c.includes("@")) return order.email.toLowerCase() === c.toLowerCase();
  const mobile = normalizeIndianMobile(c);
  return !!mobile && order.phone === mobile;
}
