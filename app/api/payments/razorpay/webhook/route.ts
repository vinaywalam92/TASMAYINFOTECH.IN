import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/integrations/payments";
import { confirmPayment, recordPaymentFailure } from "@/lib/orders";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  method?: string;
  error_description?: string | null;
};

type WebhookBody = {
  event: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: { id: string; payment_id: string; amount: number } };
  };
};

/**
 * Razorpay webhook. Authenticity is proven by the HMAC of the RAW body, so we read text() first.
 * Handlers are idempotent; Razorpay retries on non-2xx.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const p = body.payload?.payment?.entity;
  try {
    switch (body.event) {
      case "payment.captured":
      case "order.paid":
        if (p && p.status === "captured") {
          await confirmPayment({
            providerOrderId: p.order_id,
            providerPaymentId: p.id,
            amountPaise: p.amount,
            method: p.method ?? null,
          });
        }
        break;
      case "payment.failed":
        if (p) await recordPaymentFailure(p.order_id, p.id, p.error_description ?? null);
        break;
      case "refund.processed": {
        const r = body.payload?.refund?.entity;
        if (r) {
          const payment = await db.payment.findUnique({ where: { providerPaymentId: r.payment_id } });
          if (payment) {
            const refunded = Math.min(payment.amountPaise, Math.max(payment.refundedPaise, r.amount));
            await db.payment.update({
              where: { id: payment.id },
              data: { refundedPaise: refunded, providerRefundId: r.id, status: refunded >= payment.amountPaise ? "REFUNDED" : payment.status },
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false }, { status: 500 }); // let Razorpay retry
  }
  return NextResponse.json({ ok: true });
}
