import "server-only";
import { randomBytes } from "node:crypto";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";
import { sendEmail } from "@/lib/integrations/email";
import { orderConfirmationEmail, orderStatusEmail } from "@/lib/emails";
import { ORDER_STATUS_LABEL } from "@/lib/format";
import { signOrderAccess } from "@/lib/order-access";

export function generateOrderNumber(): string {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `TI-${yy}${mm}${dd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function trackUrlFor(orderNumber: string): string {
  return `${SITE_URL}/track-order?order=${encodeURIComponent(orderNumber)}&t=${signOrderAccess(orderNumber)}`;
}

type Tx = Prisma.TransactionClient;

const CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "PROCESSING", "PACKED"];

// ───────────────────────── stock helpers (Product.stock + InventoryAdjustment ledger) ─────────────────────────

/** Atomically take stock. Returns false (and takes nothing) if there is not enough. */
export async function reserveStock(tx: Tx, productId: string, qty: number, orderRef: string): Promise<boolean> {
  const res = await tx.product.updateMany({
    where: { id: productId, stock: { gte: qty } },
    data: { stock: { decrement: qty } },
  });
  if (res.count !== 1) return false;
  await tx.inventoryAdjustment.create({ data: { productId, delta: -qty, reason: "ORDER_RESERVED", orderRef } });
  return true;
}

async function restock(tx: Tx, productId: string, qty: number, orderRef: string, reason: "ORDER_RELEASED" | "ORDER_CANCELLED") {
  await tx.product.updateMany({ where: { id: productId }, data: { stock: { increment: qty } } });
  await tx.inventoryAdjustment.create({ data: { productId, delta: qty, reason, orderRef } });
}

// ───────────────────────── payment → order ─────────────────────────

export type CaptureInput = {
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
  method?: string | null;
};

export type CaptureOutcome =
  | { ok: true; orderNumber: string; alreadyConfirmed: boolean }
  | { ok: false; reason: "unknown_order" | "amount_mismatch" | "needs_refund"; orderNumber?: string };

/**
 * Marks an order paid. Idempotent: safe to call from both the browser callback and the webhook,
 * even concurrently (the transaction re-reads the payment row).
 */
export async function confirmPayment(input: CaptureInput): Promise<CaptureOutcome> {
  const result = await db.$transaction(async (tx): Promise<CaptureOutcome & { justConfirmed?: boolean }> => {
    const payment = await tx.payment.findUnique({
      where: { providerOrderId: input.providerOrderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) return { ok: false, reason: "unknown_order" };
    const order = payment.order;

    if (payment.amountPaise !== input.amountPaise) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: `Amount mismatch (gateway ${input.amountPaise}, expected ${payment.amountPaise})` },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, status: order.status, note: "Payment amount did not match the order total. Flagged for review." },
      });
      return { ok: false, reason: "amount_mismatch", orderNumber: order.orderNumber };
    }

    if (payment.status === "PAID" && order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED") {
      return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: true };
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        providerPaymentId: input.providerPaymentId,
        gatewayMethod: input.method ?? payment.gatewayMethod,
        failureReason: null,
      },
    });

    if (order.status === "PENDING_PAYMENT") {
      // Conditional transition: if the webhook and the browser callback race, exactly one wins.
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (moved.count !== 1) return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: true };
      await tx.orderEvent.create({ data: { orderId: order.id, status: "PAID", note: "Payment received and verified." } });
      for (const it of order.items) {
        if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
      }
      return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: false, justConfirmed: true };
    }

    if (order.status === "CANCELLED") {
      // Customer paid after the stock hold expired: try to re-reserve everything.
      const taken: { productId: string; qty: number }[] = [];
      let allReserved = true;
      for (const it of order.items) {
        if (!it.productId) continue;
        if (!(await reserveStock(tx, it.productId, it.quantity, order.orderNumber))) {
          allReserved = false;
          break;
        }
        taken.push({ productId: it.productId, qty: it.quantity });
      }
      if (allReserved) {
        const moved = await tx.order.updateMany({
          where: { id: order.id, status: "CANCELLED" },
          data: { status: "PAID", paidAt: new Date(), cancelledAt: null, stockRestocked: false },
        });
        if (moved.count !== 1) throw new Error("Order changed concurrently"); // rolls back the re-reservation; caller retries
        await tx.orderEvent.create({
          data: { orderId: order.id, status: "PAID", note: "Payment received after the stock hold expired; stock was re-reserved." },
        });
        for (const it of order.items) {
          if (it.productId) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
        }
        return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: false, justConfirmed: true };
      }
      for (const t of taken) await restock(tx, t.productId, t.qty, order.orderNumber, "ORDER_RELEASED");
      await tx.orderEvent.create({
        data: { orderId: order.id, status: "CANCELLED", note: "Payment received after cancellation and stock is no longer available. REFUND REQUIRED." },
      });
      return { ok: false, reason: "needs_refund", orderNumber: order.orderNumber };
    }

    return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: true };
  });

  if (result.ok && "justConfirmed" in result && result.justConfirmed) {
    void sendOrderConfirmation(result.orderNumber);
  }
  return result;
}

export async function recordPaymentFailure(providerOrderId: string, providerPaymentId: string | null, reason: string | null) {
  const payment = await db.payment.findUnique({ where: { providerOrderId } });
  if (!payment || payment.status === "PAID" || payment.status === "REFUNDED") return;
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      providerPaymentId: payment.providerPaymentId ?? providerPaymentId ?? undefined,
      failureReason: reason?.slice(0, 300) ?? "Payment failed",
    },
  });
}

export async function sendOrderConfirmation(orderNumber: string) {
  try {
    const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true } });
    if (!order || order.confirmationEmailAt) return;
    const addr = order.shippingAddress as { name?: string };
    const mail = orderConfirmationEmail({
      orderNumber,
      name: addr.name ?? "there",
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, lineGrossPaise: i.lineTotalPaise })),
      discountPaise: order.discountPaise,
      shippingPaise: order.shippingPaise,
      totalPaise: order.totalPaise,
      trackUrl: trackUrlFor(orderNumber),
    });
    const res = await sendEmail({ to: order.email, ...mail });
    if (res.sent) await db.order.update({ where: { id: order.id }, data: { confirmationEmailAt: new Date() } });
  } catch (err) {
    console.error("[orders] confirmation email failed:", err instanceof Error ? err.message : err);
  }
}

// ───────────────────────── cancel / release / status ─────────────────────────

/**
 * Cancels an order and returns its stock. Does NOT refund money: call refundOrder() for paid orders
 * (kept separate so a gateway failure never blocks the cancellation itself).
 */
export async function cancelOrder(orderId: string, note: string): Promise<{ ok: boolean; error?: string }> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return { ok: false, error: "Order not found" };
    if (!CANCELLABLE.includes(order.status)) {
      return { ok: false, error: `Orders that are ${ORDER_STATUS_LABEL[order.status].toLowerCase()} cannot be cancelled` };
    }

    const wasPaid = order.status !== "PENDING_PAYMENT";
    for (const it of order.items) {
      if (!it.productId) continue;
      await restock(tx, it.productId, it.quantity, order.orderNumber, wasPaid ? "ORDER_CANCELLED" : "ORDER_RELEASED");
      if (wasPaid) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { decrement: it.quantity } } });
    }
    if (order.couponCode) {
      await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "code" = ${order.couponCode}`;
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date(), stockRestocked: true } });
    await tx.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note } });
    return { ok: true };
  });
}

/** Cancel unpaid orders whose stock hold has expired. Called by the cron route. */
export async function releaseExpiredOrders(): Promise<number> {
  const minutes = Math.max(5, Number(process.env.UNPAID_ORDER_HOLD_MINUTES ?? 30));
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const stale = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { lt: cutoff },
      payments: { none: { status: "PAID" } },
    },
    select: { id: true },
    take: 200,
  });
  let n = 0;
  for (const o of stale) {
    const r = await cancelOrder(o.id, "Payment was not completed in time; items released.");
    if (r.ok) n++;
  }
  return n;
}

const FORWARD: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [],
  PAID: ["PROCESSING", "PACKED", "SHIPPED", "CANCELLED"],
  PROCESSING: ["PACKED", "SHIPPED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function allowedNextStatuses(status: OrderStatus): OrderStatus[] {
  return FORWARD[status];
}

export async function advanceOrder(orderId: string, next: OrderStatus, note: string | null): Promise<{ ok: boolean; error?: string }> {
  if (next === "CANCELLED") return cancelOrder(orderId, note || "Cancelled by TASMAY INFOTECH.");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (!FORWARD[order.status].includes(next)) {
    return { ok: false, error: `Cannot move an order from "${ORDER_STATUS_LABEL[order.status]}" to "${ORDER_STATUS_LABEL[next]}"` };
  }
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: next } });
    await tx.orderEvent.create({ data: { orderId, status: next, note } });
    if (next === "DELIVERED") {
      await tx.shipment.updateMany({ where: { orderId, deliveredAt: null }, data: { deliveredAt: new Date() } });
    }
  });
  const mail = orderStatusEmail(order.orderNumber, ORDER_STATUS_LABEL[next], note, trackUrlFor(order.orderNumber));
  void sendEmail({ to: order.email, ...mail });
  return { ok: true };
}
