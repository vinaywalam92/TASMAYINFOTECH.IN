"use server";

import { z } from "zod";
import { MAX_CART_QTY } from "@/lib/constants";
import { addItem, applyCoupon, clearCoupon, currentCartView, removeItem, setItemQty, setPincode, type CartView } from "@/lib/cart";
import { couponInputSchema, pinSchema } from "@/lib/validators";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export type CartActionResult = { ok: boolean; error?: string; cart: CartView };

async function throttle(): Promise<string | null> {
  const rl = await rateLimit(`cart:${await getClientIp()}`, 120, 60);
  return rl.ok ? null : "You are doing that too quickly. Please wait a moment.";
}

async function result(error?: string): Promise<CartActionResult> {
  return { ok: !error, error, cart: await currentCartView() };
}

const idSchema = z.string().min(10).max(40);
const qtySchema = z.number().int().min(1).max(MAX_CART_QTY);

export async function getCartAction(): Promise<CartActionResult> {
  return result();
}

export async function addToCartAction(productId: string, quantity = 1): Promise<CartActionResult> {
  const limited = await throttle();
  if (limited) return result(limited);
  const pid = idSchema.safeParse(productId);
  const qty = qtySchema.safeParse(quantity);
  if (!pid.success || !qty.success) return result("Invalid request.");
  const r = await addItem(pid.data, qty.data);
  return result(r.error);
}

export async function setCartQuantityAction(productId: string, quantity: number): Promise<CartActionResult> {
  const limited = await throttle();
  if (limited) return result(limited);
  const pid = idSchema.safeParse(productId);
  if (!pid.success || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000) return result("Invalid request.");
  const r = await setItemQty(pid.data, quantity);
  return result(r.error);
}

export async function removeCartItemAction(productId: string): Promise<CartActionResult> {
  const pid = idSchema.safeParse(productId);
  if (pid.success) await removeItem(pid.data);
  return result();
}

export async function applyCouponAction(code: string): Promise<CartActionResult> {
  const limited = await throttle();
  if (limited) return result(limited);
  const parsed = couponInputSchema.safeParse(code);
  if (!parsed.success) return result("Enter a valid coupon code.");
  const r = await applyCoupon(parsed.data);
  return result(r.error);
}

export async function removeCouponAction(): Promise<CartActionResult> {
  await clearCoupon();
  return result();
}

export async function setDeliveryPinAction(pin: string): Promise<CartActionResult> {
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) return result(parsed.error.issues[0].message);
  await setPincode(parsed.data);
  return result();
}
