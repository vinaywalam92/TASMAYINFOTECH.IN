"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { OrderStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { advanceOrder } from "@/lib/orders";
import { refundOrder } from "@/lib/refunds";
import { saveSettings, POLICY_KEYS, type SiteSettings } from "@/lib/settings";
import { bool, flash, int, paise, str } from "@/lib/admin-helpers";

// ───── orders ─────
export async function advanceOrderAction(fd: FormData) {
  const user = await assertPermission("orders:write");
  const id = str(fd, "id", 40);
  const next = str(fd, "next", 30) as OrderStatus;
  const r = await advanceOrder(id, next, str(fd, "note", 300) || null);
  await audit(user.id, "order.status", "Order", id, { next, ok: r.ok });
  revalidatePath(`/admin/orders/${id}`);
  flash(`/admin/orders/${id}`, r.ok ? "saved" : "error", r.error ?? "Status updated");
}

export async function addShipmentAction(fd: FormData) {
  const user = await assertPermission("orders:write");
  const orderId = str(fd, "orderId", 40);
  const courier = str(fd, "courier", 80);
  const trackingNumber = str(fd, "trackingNumber", 80) || null;
  const url = str(fd, "trackingUrl", 500);
  if (!courier) flash(`/admin/orders/${orderId}`, "error", "Courier name is required.");
  await db.shipment.create({ data: { orderId, courier, trackingNumber, trackingUrl: /^https:\/\//i.test(url) ? url : null, shippedAt: new Date() } });
  await audit(user.id, "shipment.create", "Order", orderId);
  flash(`/admin/orders/${orderId}`, "saved", "Shipment added. Move the order to Shipped to notify the customer.");
}

export async function refundOrderAction(fd: FormData) {
  const user = await assertPermission("payments:confirm");
  const id = str(fd, "id", 40);
  const r = await refundOrder(id, str(fd, "reason", 200) || "Refund issued by TASMAY INFOTECH");
  await audit(user.id, "order.refund", "Order", id, { ok: r.ok, message: r.message });
  flash(`/admin/orders/${id}`, r.ok ? "saved" : "error", r.message);
}

// ───── coupons ─────
export async function saveCouponAction(fd: FormData) {
  const user = await assertPermission("coupons:write");
  const id = str(fd, "id", 40);
  const code = str(fd, "code", 40).toUpperCase();
  const type = str(fd, "type", 10) === "FLAT" ? "FLAT" : "PERCENT";
  const raw = type === "FLAT" ? paise(fd, "value") : int(fd, "value", 0);
  if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !raw || raw <= 0) flash("/admin/coupons", "error", "Valid code and value are required.");
  if (type === "PERCENT" && raw! > 100) flash("/admin/coupons", "error", "Percent must be 1–100.");
  const d = (k: string) => { const v = str(fd, k, 20); return v ? new Date(v) : null; };
  const data = {
    code, type: type as "FLAT" | "PERCENT", value: raw!, description: str(fd, "description", 200) || null,
    minOrderPaise: paise(fd, "minOrder") ?? 0, maxDiscountPaise: paise(fd, "maxDiscount"),
    startsAt: d("startsAt"), endsAt: d("endsAt"), usageLimit: int(fd, "usageLimit", 0) || null,
    isActive: bool(fd, "isActive"), showOnHome: bool(fd, "showOnHome"),
  };
  try {
    const c = id ? await db.coupon.update({ where: { id }, data }) : await db.coupon.create({ data });
    await audit(user.id, id ? "coupon.update" : "coupon.create", "Coupon", c.id);
  } catch { flash("/admin/coupons", "error", "Could not save. Coupon codes must be unique."); }
  revalidatePath("/", "layout");
  flash("/admin/coupons", "saved");
}

// ───── shipping rules ─────
export async function saveShippingRuleAction(fd: FormData) {
  const user = await assertPermission("shipping:write");
  const id = str(fd, "id", 40);
  const name = str(fd, "name", 100);
  if (!name) flash("/admin/shipping", "error", "Rule name is required.");
  const prefixes = str(fd, "prefixes", 500).split(/[,\s]+/).filter((p) => /^\d{1,6}$/.test(p));
  const min = Math.max(0, int(fd, "etaMin", 2)); const max = Math.max(min, int(fd, "etaMax", 7));
  const data = {
    name, pincodePrefixes: prefixes, feePaise: paise(fd, "fee") ?? 0, freeAbovePaise: paise(fd, "freeAbove"),
    etaMinDays: min, etaMaxDays: max, serviceable: bool(fd, "serviceable"), note: str(fd, "note", 300) || null,
    isActive: bool(fd, "isActive"), sortOrder: int(fd, "sortOrder", 0),
  };
  const r = id ? await db.shippingRule.update({ where: { id }, data }) : await db.shippingRule.create({ data });
  await audit(user.id, id ? "shipping.update" : "shipping.create", "ShippingRule", r.id);
  flash("/admin/shipping", "saved");
}
export async function deleteShippingRuleAction(fd: FormData) {
  const user = await assertPermission("shipping:write");
  const id = str(fd, "id", 40);
  await db.shippingRule.delete({ where: { id } }).catch(() => undefined);
  await audit(user.id, "shipping.delete", "ShippingRule", id);
  flash("/admin/shipping", "saved");
}

// ───── enquiries / quotes / reviews ─────
export async function setEnquiryStatusAction(fd: FormData) {
  const user = await assertPermission("enquiries:write");
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 20);
  if (str(fd, "table", 10) === "quote") {
    if (!["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST"].includes(status)) flash("/admin/enquiries", "error", "Bad status");
    await db.bulkQuote.update({ where: { id }, data: { status: status as never } });
  } else {
    if (!["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"].includes(status)) flash("/admin/enquiries", "error", "Bad status");
    await db.contactEnquiry.update({ where: { id }, data: { status: status as never } });
  }
  await audit(user.id, "enquiry.status", "Enquiry", id, { status });
  flash("/admin/enquiries", "saved");
}

export async function moderateReviewAction(fd: FormData) {
  const user = await assertPermission("reviews:write");
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 10) === "APPROVED" ? "APPROVED" : "REJECTED";
  const r = await db.review.update({ where: { id }, data: { status } });
  const { recomputeRating } = await import("@/lib/catalog");
  await recomputeRating(r.productId);
  await audit(user.id, "review.moderate", "Review", id, { status });
  revalidateTag("catalog");
  flash("/admin/reviews", "saved");
}

// ───── customers & roles ─────
export async function setUserRoleAction(fd: FormData) {
  const actor = await assertPermission("customers:write");
  const id = str(fd, "id", 40);
  const role = str(fd, "role", 10) as Role;
  if (!["CUSTOMER", "STAFF", "ADMIN"].includes(role)) flash("/admin/customers", "error", "Bad role");
  if (id === actor.id) flash("/admin/customers", "error", "You cannot change your own role.");
  await db.user.update({ where: { id }, data: { role } });
  await db.session.deleteMany({ where: { userId: id } });
  await audit(actor.id, "user.role", "User", id, { role });
  flash("/admin/customers", "saved");
}
export async function setUserActiveAction(fd: FormData) {
  const actor = await assertPermission("customers:write");
  const id = str(fd, "id", 40);
  if (id === actor.id) flash("/admin/customers", "error", "You cannot deactivate yourself.");
  const active = bool(fd, "active");
  await db.user.update({ where: { id }, data: { isActive: active } });
  if (!active) await db.session.deleteMany({ where: { userId: id } });
  await audit(actor.id, "user.active", "User", id, { active });
  flash("/admin/customers", "saved");
}

// ───── settings ─────
export async function saveSettingsAction(fd: FormData) {
  const user = await assertPermission("settings:write");
  const section = str(fd, "section", 20);
  let patch: Partial<SiteSettings> = {};
  if (section === "business") {
    patch = {
      businessName: str(fd, "businessName", 100) || "TASMAY INFOTECH", legalName: str(fd, "legalName", 150), email: str(fd, "email", 150), phone: str(fd, "phone", 40),
      whatsapp: str(fd, "whatsapp", 40), address: str(fd, "address", 400), hours: str(fd, "hours", 200), mapEmbedUrl: str(fd, "mapEmbedUrl", 600),
      gstin: str(fd, "gstin", 15).toUpperCase(), sellerStateCode: str(fd, "sellerStateCode", 2), notifyEmail: str(fd, "notifyEmail", 150),
      priceDisplay: str(fd, "priceDisplay", 4) === "EXCL" ? "EXCL" : "INCL",
      social: { facebook: str(fd, "facebook", 200), instagram: str(fd, "instagram", 200), linkedin: str(fd, "linkedin", 200), x: str(fd, "x", 200), youtube: str(fd, "youtube", 200) },
    };
  } else if (section === "delivery") {
    const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => fd.get(`wd${d}`) === "on");
    patch = {
      cutoffHour: Math.min(23, Math.max(0, int(fd, "cutoffHour", 15))), handlingDays: Math.max(0, int(fd, "handlingDays", 1)), workingDays: days,
      holidays: str(fd, "holidays", 2000).split(/[\s,]+/).filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h)), deliveryNotice: str(fd, "deliveryNotice", 300),
    };
  } else if (section === "content") {
    const titles = fd.getAll("benefitTitle").map(String); const bodies = fd.getAll("benefitBody").map(String);
    const rw = int(fd, "returnWindowDays", 0);
    patch = {
      aboutBody: str(fd, "aboutBody", 8000), returnWindowDays: rw > 0 ? rw : null,
      benefits: titles.map((t, i) => ({ title: t.trim().slice(0, 100), body: (bodies[i] ?? "").trim().slice(0, 300) })).filter((b) => b.title),
    };
  } else if (section === "policies") {
    const policies = Object.fromEntries(POLICY_KEYS.map((k) => [k, str(fd, `policy_${k}`, 20000)])) as SiteSettings["policies"];
    patch = { policies };
  } else flash("/admin/settings", "error", "Unknown section");
  await saveSettings(patch);
  await audit(user.id, "settings.update", "Settings", section);
  revalidateTag("settings");
  revalidatePath("/", "layout");
  flash("/admin/settings", "saved");
}
