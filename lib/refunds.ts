import "server-only";
import { db } from "@/lib/db";
import { isPaymentConfigured, refundGatewayPayment } from "@/lib/integrations/payments";

/**
 * Refund the captured payment of an order through the gateway (full remaining amount).
 * Never pretends: if the gateway is not configured or rejects the call, the order gets an
 * explicit "refund pending" event so staff can follow up manually.
 */
export async function refundOrder(orderId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return { ok: false, message: "Order not found." };
  const payment = order.payments.find((p) => p.status === "PAID" && p.providerPaymentId);
  if (!payment || !payment.providerPaymentId) return { ok: false, message: "No captured payment to refund." };

  const remaining = payment.amountPaise - payment.refundedPaise;
  if (remaining <= 0) return { ok: false, message: "This payment has already been refunded." };

  if (!isPaymentConfigured()) {
    await db.orderEvent.create({ data: { orderId, status: order.status, note: "Refund pending: payment gateway is not configured. Refund manually." } });
    return { ok: false, message: "Payment gateway is not configured; refund manually in your gateway dashboard." };
  }

  try {
    const refund = await refundGatewayPayment(payment.providerPaymentId, remaining, { orderNumber: order.orderNumber, reason: reason.slice(0, 200) });
    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED", refundedPaise: payment.amountPaise, providerRefundId: refund.id },
      }),
      db.orderEvent.create({ data: { orderId, status: order.status, note: `Refund of the full amount initiated with the payment gateway (${reason}).` } }),
    ]);
    return { ok: true, message: "Refund initiated. It usually reaches the customer in 5-7 business days." };
  } catch (err) {
    console.error("[refund] failed:", err instanceof Error ? err.message : err);
    await db.orderEvent.create({ data: { orderId, status: order.status, note: "Refund attempt failed. Retry from the admin order page or refund in the gateway dashboard." } });
    return { ok: false, message: "The gateway rejected the refund request. See server logs; retry or refund in the gateway dashboard." };
  }
}
