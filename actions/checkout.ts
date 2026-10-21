"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildCartView, findCartId, loadCoupon } from "@/lib/cart";
import { computeTotals, couponProblem, type CouponRule } from "@/lib/pricing";
import { cancelOrder, generateOrderNumber, reserveStock } from "@/lib/orders";
import { createGatewayOrder, isPaymentConfigured, razorpayKeyId } from "@/lib/integrations/payments";
import { signOrderAccess } from "@/lib/order-access";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema, emailSchema, fieldErrors, optionalGstin, phoneSchema } from "@/lib/validators";
import { visibleProduct } from "@/lib/catalog";

const checkoutSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  shipping: addressSchema,
  billingSame: z.boolean(),
  billing: addressSchema.optional(),
  gstin: optionalGstin,
  notes: z.string().trim().max(500).optional().default(""),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type PlaceOrderResult =
  | {
      ok: true;
      orderNumber: string;
      accessToken: string;
      gatewayOrderId: string;
      keyId: string;
      amountPaise: number;
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: false; message: string; errors?: Record<string, string> };

class CheckoutError extends Error {}

/** Plain-JSON copy (drops `undefined`) so addresses are valid for Prisma Json columns. */
const toJson = (v: object) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonObject;
const fail = (message: string, errors?: Record<string, string>): PlaceOrderResult => ({ ok: false, message, errors });

/** Online orders above this value must go through a quotation instead (gateway limits, fraud exposure). */
const MAX_ONLINE_ORDER_PAISE = Number(process.env.MAX_ONLINE_ORDER_PAISE ?? 50_000_000); // ₹5,00,000

/**
 * Creates a PENDING_PAYMENT order (stock held, totals recomputed server-side) and a gateway payment
 * session. The order only becomes PAID after server-side verification (see api/payments/razorpay/*).
 */
export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderResult> {
  const ip = await getClientIp();
  const rl = await rateLimit(`checkout:${ip}`, 15, 3600);
  if (!rl.ok) return fail("Too many checkout attempts. Please try again later.");

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return fail("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;
  if (!data.billingSame && !data.billing) return fail("Please enter your billing address.", { billing: "Required" });

  // Never accept an order we cannot take payment for (there is no simulated payment path).
  if (!isPaymentConfigured()) {
    return fail("Online payments are not available right now. Please contact us to place this order.");
  }

  const user = await getCurrentUser();
  const cartId = await findCartId(false);
  if (!cartId) return fail("Your cart is empty.");

  await db.cart.update({ where: { id: cartId }, data: { pincode: data.shipping.pincode } });
  const view = await buildCartView(cartId);
  if (!view.lines.length) return fail("Your cart is empty.");
  if (view.issues.length) return fail(view.issues[0]);
  if (view.shippingStatus !== "ok") return fail(view.shippingLabel ?? "We cannot deliver to this PIN code right now.");
  if (view.totalPaise > MAX_ONLINE_ORDER_PAISE) {
    return fail("This order is too large to pay for online. Please use Request a Quote and we will assist you.");
  }

  let rule: CouponRule | null = null;
  if (view.couponCode) {
    const c = await loadCoupon(view.couponCode);
    if (!c || couponProblem(c, view.subtotalPaise)) return fail("Your coupon is no longer valid. Please review your cart.");
    rule = { code: c.code, type: c.type, value: c.value, minOrderPaise: c.minOrderPaise, maxDiscountPaise: c.maxDiscountPaise };
  }

  // Customer restarted checkout: release any earlier unpaid hold for the same email.
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", email: data.email, payments: { none: { status: "PAID" } } },
    select: { id: true },
    take: 10,
  });
  for (const s of stale) await cancelOrder(s.id, "Superseded by a new checkout.");

  const orderNumber = generateOrderNumber();
  let order: { id: string };
  try {
    order = await db.$transaction(async (tx) => {
      // Re-read prices inside the transaction: the DB, not the browser, is the source of truth.
      const products = await tx.product.findMany({
        where: { AND: [visibleProduct(), { id: { in: view.lines.map((l) => l.productId) } }] },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      const lines = view.lines.map((l) => {
        const p = byId.get(l.productId);
        if (!p) throw new CheckoutError(`“${l.name}” is no longer available.`);
        return { p, qty: l.qty };
      });
      const totals = computeTotals(
        lines.map((l) => ({ productId: l.p.id, unitPaise: l.p.pricePaise, qty: l.qty, gstRate: l.p.gstRate })),
        { gstInclusive: view.gstInclusive, coupon: rule, shippingPaise: view.shippingPaise },
      );
      if (totals.totalPaise !== view.totalPaise) {
        throw new CheckoutError("Prices changed while you were checking out. Please review your cart and try again.");
      }

      if (view.couponCode) {
        const n = await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE "code" = ${view.couponCode} AND "isActive" = true
          AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (n !== 1) throw new CheckoutError("This coupon is no longer available.");
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          accessToken: signOrderAccess(orderNumber),
          userId: user?.id ?? null,
          email: data.email,
          phone: data.phone,
          status: "PENDING_PAYMENT",
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          shippingPaise: totals.shippingPaise,
          taxPaise: totals.taxPaise,
          totalPaise: totals.totalPaise,
          gstInclusive: view.gstInclusive,
          couponCode: view.couponCode,
          shippingAddress: toJson(data.shipping),
          billingAddress: toJson(data.billingSame ? data.shipping : (data.billing ?? data.shipping)),
          gstin: data.gstin ?? null,
          notes: data.notes || null,
          estimatedDeliveryText: view.estimateText,
          items: {
            create: lines.map((l, i) => ({
              productId: l.p.id,
              name: l.p.name,
              sku: l.p.sku,
              hsnCode: l.p.hsnCode,
              unitPricePaise: l.p.pricePaise,
              quantity: l.qty,
              gstRate: l.p.gstRate,
              taxPaise: totals.lines[i].taxPaise,
              lineTotalPaise: totals.lines[i].lineTotalPaise,
            })),
          },
          events: { create: { status: "PENDING_PAYMENT", note: "Order created. Waiting for payment." } },
        },
      });

      for (const l of lines) {
        if (!(await reserveStock(tx, l.p.id, l.qty, orderNumber))) {
          throw new CheckoutError(`Sorry, “${l.p.name}” just went out of stock or has fewer units available.`);
        }
      }
      return created;
    });
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    console.error("[checkout] order creation failed:", err);
    return fail("We could not create your order. Please try again.");
  }

  try {
    const gateway = await createGatewayOrder({
      amountPaise: view.totalPaise,
      receipt: orderNumber,
      notes: { orderNumber },
    });
    await db.payment.create({
      data: { orderId: order.id, method: "RAZORPAY", providerOrderId: gateway.id, amountPaise: view.totalPaise, status: "PENDING" },
    });
    return {
      ok: true,
      orderNumber,
      accessToken: signOrderAccess(orderNumber),
      gatewayOrderId: gateway.id,
      keyId: razorpayKeyId(),
      amountPaise: view.totalPaise,
      prefill: { name: data.shipping.name, email: data.email, contact: data.phone },
    };
  } catch (err) {
    console.error("[checkout] gateway order failed:", err instanceof Error ? err.message : err);
    await cancelOrder(order.id, "Could not start the payment session; items released.");
    return fail("We could not start the payment. Please try again in a moment.");
  }
}
