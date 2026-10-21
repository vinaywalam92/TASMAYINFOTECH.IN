import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { getCurrentUser, randomToken } from "./auth";
import { computeTotals, couponProblem, unitInclPaise, type CouponRule } from "./pricing";
import { quoteShipping, estimateDelivery, formatEstimateRange } from "./delivery";
import { getSettings } from "./settings";
import { visibleProduct } from "./catalog";
import { CART_COOKIE, MAX_CART_QTY } from "./constants";

const CART_TTL = 60 * 60 * 24 * 60; // 60 days

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  brand: string | null;
  image: string | null;
  iconKey: string | null;
  /** unit price as listed (incl. or excl. GST per site setting) */
  unitPaise: number;
  /** unit price including GST, for display next to quantity */
  unitInclPaise: number;
  qty: number;
  stock: number;
  gstRate: number;
  /** payable for this line, incl. GST and after its share of the coupon */
  lineTotalPaise: number;
  lineDiscountPaise: number;
};

export type ShippingStatus = "empty" | "needs_pin" | "unconfigured" | "unserviceable" | "ok";

export type CartView = {
  lines: CartLine[];
  count: number;
  /** sum of listed prices (before coupon) */
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  shippingStatus: ShippingStatus;
  shippingLabel: string | null;
  /** policy-based estimate text for the entered PIN (not a courier promise) */
  estimateText: string | null;
  freeShippingRemainingPaise: number | null;
  taxPaise: number;
  totalPaise: number;
  gstInclusive: boolean;
  couponCode: string | null;
  couponError: string | null;
  pincode: string | null;
  issues: string[];
};

export const EMPTY_CART: CartView = {
  lines: [],
  count: 0,
  subtotalPaise: 0,
  discountPaise: 0,
  shippingPaise: 0,
  shippingStatus: "empty",
  shippingLabel: null,
  estimateText: null,
  freeShippingRemainingPaise: null,
  taxPaise: 0,
  totalPaise: 0,
  gstInclusive: true,
  couponCode: null,
  couponError: null,
  pincode: null,
  issues: [],
};

// ───────────────────────── cart identity ─────────────────────────

/** Finds the active cart (user cart if signed in, else guest cookie cart). Optionally creates one.
 *  Creating a guest cart sets a cookie, so `create: true` must only be used in actions / route handlers. */
export async function findCartId(create: boolean): Promise<string | null> {
  const user = await getCurrentUser();
  const jar = await cookies();
  if (user) {
    const existing = await db.cart.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (existing) return existing.id;
    if (!create) return null;
    return (await db.cart.create({ data: { userId: user.id } })).id;
  }
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const c = await db.cart.findUnique({ where: { token }, select: { id: true } });
    if (c) return c.id;
  }
  if (!create) return null;
  const newToken = randomToken(24);
  const c = await db.cart.create({ data: { token: newToken } });
  jar.set(CART_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL,
  });
  return c.id;
}

/** Called after login/registration: folds the guest cart into the user's cart. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { token }, include: { items: true } });
  if (guest && !guest.userId) {
    await db.$transaction(async (tx) => {
      const mine = (await tx.cart.findUnique({ where: { userId } })) ?? (await tx.cart.create({ data: { userId } }));
      for (const it of guest.items) {
        const existing = await tx.cartItem.findUnique({ where: { cartId_productId: { cartId: mine.id, productId: it.productId } } });
        const qty = Math.min(MAX_CART_QTY, (existing?.quantity ?? 0) + it.quantity);
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: mine.id, productId: it.productId } },
          update: { quantity: qty },
          create: { cartId: mine.id, productId: it.productId, quantity: qty },
        });
      }
      const patch: { couponCode?: string; pincode?: string } = {};
      if (guest.couponCode && !mine.couponCode) patch.couponCode = guest.couponCode;
      if (guest.pincode && !mine.pincode) patch.pincode = guest.pincode;
      if (Object.keys(patch).length) await tx.cart.update({ where: { id: mine.id }, data: patch });
      await tx.cart.delete({ where: { id: guest.id } });
    });
  }
  jar.delete(CART_COOKIE);
}

export async function loadCoupon(code: string) {
  return db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
}

// ───────────────────────── mutations (call from server actions / route handlers) ─────────────────────────

type MutationResult = { error?: string };

export async function addItem(productId: string, qty: number): Promise<MutationResult> {
  const product = await db.product.findFirst({ where: { AND: [visibleProduct(), { id: productId }] } });
  if (!product) return { error: "This product is no longer available." };
  if (product.stock <= 0) return { error: "Sorry, this product is out of stock." };
  const cartId = await findCartId(true);
  if (!cartId) return { error: "Could not create your cart." };
  const existing = await db.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  const wanted = (existing?.quantity ?? 0) + qty;
  const final = Math.min(wanted, product.stock, MAX_CART_QTY);
  await db.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity: final },
    create: { cartId, productId, quantity: final },
  });
  if (final < wanted) {
    return { error: `Only ${final} unit${final === 1 ? "" : "s"} can be added (${product.stock <= MAX_CART_QTY ? "available stock" : "per-order limit"}).` };
  }
  return {};
}

export async function setItemQty(productId: string, qty: number): Promise<MutationResult> {
  const cartId = await findCartId(false);
  if (!cartId) return {};
  if (qty <= 0) {
    await db.cartItem.deleteMany({ where: { cartId, productId } });
    return {};
  }
  const item = await db.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } }, include: { product: true } });
  if (!item) return {};
  const max = Math.min(MAX_CART_QTY, Math.max(item.product.stock, 0));
  if (max <= 0) return { error: "This item is out of stock." };
  const final = Math.min(qty, max);
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: final } });
  return final < qty ? { error: `Only ${final} available.` } : {};
}

export async function removeItem(productId: string): Promise<void> {
  const cartId = await findCartId(false);
  if (cartId) await db.cartItem.deleteMany({ where: { cartId, productId } });
}

export async function applyCoupon(code: string): Promise<MutationResult> {
  const cartId = await findCartId(false);
  if (!cartId) return { error: "Your cart is empty." };
  const coupon = await loadCoupon(code);
  if (!coupon) return { error: "This coupon code is not valid." };
  const view = await buildCartView(cartId);
  if (!view.lines.length) return { error: "Your cart is empty." };
  const problem = couponProblem(coupon, view.subtotalPaise);
  if (problem) return { error: problem };
  await db.cart.update({ where: { id: cartId }, data: { couponCode: coupon.code } });
  return {};
}

export async function clearCoupon(): Promise<void> {
  const cartId = await findCartId(false);
  if (cartId) await db.cart.update({ where: { id: cartId }, data: { couponCode: null } });
}

export async function setPincode(pin: string): Promise<void> {
  const cartId = await findCartId(true);
  if (cartId) await db.cart.update({ where: { id: cartId }, data: { pincode: pin } });
}

/** Empty the cart that paid for an order (best effort). */
export async function clearCartContents(cartId: string): Promise<void> {
  await db.cartItem.deleteMany({ where: { cartId } });
  await db.cart.update({ where: { id: cartId }, data: { couponCode: null } });
}

// ───────────────────────── view ─────────────────────────

/** Builds the full, server-authoritative cart view (prices, stock clamp, coupon, shipping, GST). */
export async function buildCartView(cartId: string | null): Promise<CartView> {
  const settings = await getSettings();
  const gstInclusive = settings.priceDisplay === "INCL";
  if (!cartId) return { ...EMPTY_CART, gstInclusive };

  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          product: {
            include: {
              brand: { select: { name: true } },
              category: { select: { iconKey: true, parent: { select: { iconKey: true } } } },
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!cart) return { ...EMPTY_CART, gstInclusive };

  const issues: string[] = [];
  // Re-check visibility: inactive / demo-in-production products drop out of the cart.
  const visibleIds = new Set(
    (
      await db.product.findMany({
        where: { AND: [visibleProduct(), { id: { in: cart.items.map((i) => i.productId) } }] },
        select: { id: true },
      })
    ).map((p) => p.id),
  );

  const lines: CartLine[] = [];
  for (const it of cart.items) {
    const p = it.product;
    if (!visibleIds.has(p.id)) {
      issues.push(`“${p.name}” is no longer available and was removed.`);
      await db.cartItem.delete({ where: { id: it.id } }).catch(() => undefined);
      continue;
    }
    let qty = it.quantity;
    if (p.stock <= 0) {
      issues.push(`“${p.name}” is out of stock. Remove it to continue.`);
    } else if (qty > p.stock) {
      qty = p.stock;
      issues.push(`Only ${p.stock} of “${p.name}” available. Quantity adjusted.`);
      await db.cartItem.update({ where: { id: it.id }, data: { quantity: qty } });
    }
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      brand: p.brand?.name ?? null,
      image: p.images[0]?.url ?? null,
      iconKey: p.category.iconKey ?? p.category.parent?.iconKey ?? null,
      unitPaise: p.pricePaise,
      unitInclPaise: unitInclPaise(p.pricePaise, p.gstRate, gstInclusive),
      qty,
      stock: p.stock,
      gstRate: p.gstRate,
      lineTotalPaise: 0,
      lineDiscountPaise: 0,
    });
  }

  // Only in-stock lines are priced; out-of-stock lines stay visible and block checkout via `issues`.
  const purchasable = lines.filter((l) => l.stock > 0);
  const priced = purchasable.map((l) => ({ productId: l.productId, unitPaise: l.unitPaise, qty: l.qty, gstRate: l.gstRate }));
  const subtotalGuess = purchasable.reduce((s, l) => s + l.unitPaise * l.qty, 0);

  // Coupon
  let couponError: string | null = null;
  let rule: CouponRule | null = null;
  let couponCode: string | null = cart.couponCode;
  if (cart.couponCode) {
    const c = await loadCoupon(cart.couponCode);
    const problem = !c ? "This coupon code is not valid." : couponProblem(c, subtotalGuess);
    if (problem || !c) {
      couponError = problem;
      couponCode = null; // not applied; keep stored code so it can re-apply if the cart changes back
      if (!c) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    } else {
      rule = { code: c.code, type: c.type, value: c.value, minOrderPaise: c.minOrderPaise, maxDiscountPaise: c.maxDiscountPaise };
    }
  }

  const base = computeTotals(priced, { gstInclusive, coupon: rule });

  // Shipping (needs a PIN)
  let shippingPaise = 0;
  let shippingStatus: ShippingStatus = purchasable.length ? "needs_pin" : "empty";
  let shippingLabel: string | null = purchasable.length ? "Enter your PIN code to calculate delivery" : null;
  let estimateText: string | null = null;
  let freeShippingRemainingPaise: number | null = null;
  if (cart.pincode && purchasable.length) {
    const afterDiscount = base.subtotalPaise - base.discountPaise;
    const q = await quoteShipping(cart.pincode, afterDiscount);
    if (q.status === "unconfigured") {
      shippingStatus = "unconfigured";
      shippingLabel = "Delivery for this PIN code has not been set up yet. Please contact us.";
    } else if (q.status === "unserviceable") {
      shippingStatus = "unserviceable";
      shippingLabel = q.note || "We do not currently deliver to this PIN code.";
    } else {
      shippingStatus = "ok";
      shippingPaise = q.feePaise;
      shippingLabel = q.free ? `Free delivery · ${q.ruleName}` : q.ruleName;
      estimateText = formatEstimateRange(estimateDelivery({ minDays: q.minDays, maxDays: q.maxDays }, settings));
      if (!q.free && q.freeAbovePaise != null) freeShippingRemainingPaise = Math.max(0, q.freeAbovePaise - afterDiscount);
    }
  }

  const totals = computeTotals(priced, { gstInclusive, coupon: rule, shippingPaise });
  for (const l of lines) {
    const r = totals.lines.find((x) => x.productId === l.productId);
    l.lineTotalPaise = r?.lineTotalPaise ?? l.unitInclPaise * l.qty;
    l.lineDiscountPaise = r?.discountPaise ?? 0;
  }

  return {
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotalPaise: totals.subtotalPaise,
    discountPaise: totals.discountPaise,
    shippingPaise,
    shippingStatus,
    shippingLabel,
    estimateText,
    freeShippingRemainingPaise,
    taxPaise: totals.taxPaise,
    totalPaise: totals.totalPaise,
    gstInclusive,
    couponCode,
    couponError,
    pincode: cart.pincode,
    issues,
  };
}

export async function currentCartView(): Promise<CartView> {
  return buildCartView(await findCartId(false));
}
