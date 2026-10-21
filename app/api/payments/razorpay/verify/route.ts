import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isSameOrigin, clientIpFromRequest } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import {
  captureGatewayPayment,
  fetchGatewayPayment,
  isPaymentConfigured,
  verifyCheckoutSignature,
} from "@/lib/integrations/payments";
import { confirmPayment, recordPaymentFailure } from "@/lib/orders";
import { clearCartContents, findCartId } from "@/lib/cart";
import { signOrderAccess } from "@/lib/order-access";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderNumber: z.string().min(6).max(40),
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(256),
});

/**
 * Browser callback after Razorpay Checkout. The client result is NOT trusted:
 *  1. HMAC signature must match
 *  2. we re-fetch the payment from Razorpay (server to server) and check status + amount
 *  3. only then is the order marked paid (idempotently; the webhook may race us)
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, message: "Bad origin" }, { status: 403 });
  if (!isPaymentConfigured()) return NextResponse.json({ ok: false, message: "Payments not configured" }, { status: 503 });

  const rl = await rateLimit(`pay-verify:${clientIpFromRequest(req)}`, 30, 600);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Too many requests" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  if (!verifyCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    return NextResponse.json({ ok: false, message: "Payment signature could not be verified." }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { providerOrderId: b.razorpay_order_id },
    include: { order: { select: { orderNumber: true } } },
  });
  if (!payment || payment.order.orderNumber !== b.orderNumber) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  try {
    let gw = await fetchGatewayPayment(b.razorpay_payment_id);
    if (gw.order_id !== b.razorpay_order_id) throw new Error("order mismatch");
    if (gw.status === "authorized") gw = await captureGatewayPayment(gw.id, payment.amountPaise);
    if (gw.status === "failed") {
      await recordPaymentFailure(b.razorpay_order_id, gw.id, gw.error_description ?? null);
      return NextResponse.json({ ok: false, message: "The payment failed. You have not been charged." }, { status: 402 });
    }
    if (gw.status !== "captured") {
      return NextResponse.json({ ok: false, pending: true, message: "Payment is still being processed. We will email you once it is confirmed." }, { status: 202 });
    }

    const outcome = await confirmPayment({
      providerOrderId: b.razorpay_order_id,
      providerPaymentId: gw.id,
      amountPaise: gw.amount,
      method: gw.method ?? null,
    });
    if (!outcome.ok) {
      return NextResponse.json(
        { ok: false, message: "We received your payment but could not complete the order automatically. Our team will contact you; your payment is safe." },
        { status: 409 },
      );
    }

    // Empty the cart that paid for this order (best effort).
    const cartId = await findCartId(false).catch(() => null);
    if (cartId) await clearCartContents(cartId).catch(() => undefined);

    return NextResponse.json({ ok: true, orderNumber: outcome.orderNumber, token: signOrderAccess(outcome.orderNumber) });
  } catch (err) {
    console.error("[payments] verify failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, message: "We could not confirm the payment yet. If money was deducted, the order will be confirmed automatically." }, { status: 502 });
  }
}
