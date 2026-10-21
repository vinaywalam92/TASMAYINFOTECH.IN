import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay integration boundary (server-side only; uses the REST API, no SDK).
 *
 * Required env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (+ RAZORPAY_WEBHOOK_SECRET for webhooks).
 * When keys are missing, isPaymentConfigured() is false and checkout refuses to take an order:
 * there is NO simulated / fake payment path anywhere in this codebase.
 */
const API = "https://api.razorpay.com/v1";

export function isPaymentConfigured(): boolean {
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function rzp<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(`Razorpay ${res.status}: ${data.error?.description ?? "request failed"}`);
  }
  return data;
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string };
export type RzpPayment = {
  id: string;
  order_id: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  amount: number;
  method?: string;
  error_description?: string | null;
};

export function createGatewayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  return rzp<RzpOrder>("/orders", {
    method: "POST",
    body: { amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes ?? {} },
  });
}

export function fetchGatewayPayment(paymentId: string) {
  return rzp<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function captureGatewayPayment(paymentId: string, amountPaise: number) {
  return rzp<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: { amount: amountPaise, currency: "INR" },
  });
}

export function refundGatewayPayment(paymentId: string, amountPaise: number, notes?: Record<string, string>) {
  return rzp<{ id: string; amount: number; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: { amount: amountPaise, notes: notes ?? {} },
  });
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout.js callback signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
