"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, randomToken, sha256 } from "@/lib/auth";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { HUMAN_CHECK_MESSAGE, verifyHuman } from "@/lib/spam";
import { sendEmail } from "@/lib/integrations/email";
import { internalNotification, newsletterConfirmEmail } from "@/lib/emails";
import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/constants";
import { contactSchema, emailSchema, fieldErrors, formDataToObject, quoteSchema, type ActionState } from "@/lib/validators";

async function notifyTeam(subject: string, lines: Record<string, string | undefined>) {
  const settings = await getSettings();
  const to = process.env.ADMIN_NOTIFY_EMAIL || settings.notifyEmail || settings.email;
  if (!to) return; // nothing configured: enquiry is still stored and visible in Admin
  await sendEmail({ to, ...internalNotification(subject, lines) });
}

const ref = (id: string) => id.slice(-8).toUpperCase();

// ───────────── contact ─────────────

export async function contactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`contact:${ip}`, 5, 3600);
  if (!rl.ok) return { message: "You have sent several messages recently. Please try again later." };
  const human = await verifyHuman(fd, ip);
  if (!human.ok) return { message: HUMAN_CHECK_MESSAGE };

  const raw = formDataToObject(fd);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const d = parsed.data;

  const row = await db.contactEnquiry.create({
    data: {
      name: d.name,
      company: d.company ?? null,
      email: d.email,
      phone: d.phone,
      enquiryType: d.enquiryType,
      productRef: d.productRef ?? null,
      message: d.message,
      consentAt: new Date(),
      ip,
    },
  });
  void notifyTeam(`New enquiry from ${d.name}`, {
    Reference: ref(row.id),
    Type: d.enquiryType,
    Name: d.name,
    Company: d.company,
    Email: d.email,
    Mobile: d.phone,
    Product: d.productRef,
    Message: d.message,
  });
  return {
    ok: true,
    message: `Thank you, ${d.name.split(" ")[0]}. Your message has been received (reference ${ref(row.id)}). We will reply to ${d.email}.`,
  };
}

// ───────────── business quote / bulk ─────────────

export async function quoteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`quote:${ip}`, 5, 3600);
  if (!rl.ok) return { message: "You have submitted several requests recently. Please try again later." };
  const human = await verifyHuman(fd, ip);
  if (!human.ok) return { message: HUMAN_CHECK_MESSAGE };

  const raw = formDataToObject(fd);
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const d = parsed.data;

  const row = await db.bulkQuote.create({
    data: {
      kind: d.kind,
      name: d.name,
      company: d.company ?? null,
      organisation: d.organisation ?? null,
      email: d.email,
      phone: d.phone,
      gstin: d.gstin ?? null,
      items: d.items,
      quantity: d.quantity ?? null,
      budget: d.budget ?? null,
      timeline: d.timeline ?? null,
      deliveryCity: d.deliveryCity ?? null,
      notes: d.notes ?? null,
      consentAt: new Date(),
      ip,
    },
  });
  void notifyTeam(`New ${d.kind.toLowerCase()} request`, {
    Reference: ref(row.id),
    Contact: d.name,
    Company: d.company,
    Organisation: d.organisation,
    GSTIN: d.gstin,
    Email: d.email,
    Mobile: d.phone,
    "Delivery city": d.deliveryCity,
    Quantity: d.quantity,
    Budget: d.budget,
    Timeline: d.timeline,
    Items: d.items,
    Notes: d.notes,
  });
  return { ok: true, message: `Request received (reference ${ref(row.id)}). Our team will review it and respond at ${d.email}.` };
}

// ───────────── newsletter (double opt-in) ─────────────

export async function subscribeNewsletterAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`news:${ip}`, 5, 3600);
  if (!rl.ok) return { message: "Too many attempts. Please try again later." };
  const human = await verifyHuman(fd, ip);
  if (!human.ok) return { message: HUMAN_CHECK_MESSAGE };

  const email = emailSchema.safeParse(String(fd.get("email") ?? ""));
  if (!email.success) return { errors: { email: "Enter a valid email address" } };
  if (fd.get("consent") !== "on") return { errors: { consent: "Please tick the consent box to subscribe" } };

  const token = randomToken(24);
  const existing = await db.newsletterSubscriber.findUnique({ where: { email: email.data } });
  await db.newsletterSubscriber.upsert({
    where: { email: email.data },
    update: { confirmHash: sha256(token), consentAt: new Date(), consentIp: ip, unsubscribedAt: null },
    create: { email: email.data, confirmHash: sha256(token), consentIp: ip },
  });
  // Already-confirmed addresses get the identical response (no enumeration) and no extra email.
  if (!existing?.confirmedAt) {
    await sendEmail({ to: email.data, ...newsletterConfirmEmail(`${SITE_URL}/newsletter/confirm?token=${encodeURIComponent(token)}`) });
  }
  return { ok: true, message: "Almost done. Check your inbox and confirm your subscription." };
}

// ───────────── wishlist ─────────────

export async function toggleWishlistAction(productId: string): Promise<{ ok: boolean; loginRequired?: boolean; inWishlist?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, loginRequired: true };
  if (typeof productId !== "string" || productId.length > 40) return { ok: false };
  const where = { userId_productId: { userId: user.id, productId } };
  const existing = await db.wishlistItem.findUnique({ where });
  if (existing) {
    await db.wishlistItem.delete({ where });
    revalidatePath("/wishlist");
    return { ok: true, inWishlist: false };
  }
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { ok: false };
  await db.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/wishlist");
  return { ok: true, inWishlist: true };
}

// ───────────── reviews (verified purchasers only, moderated) ─────────────

export async function submitReviewAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Please sign in to write a review." };
  const rl = await rateLimit(`review:${user.id}`, 5, 3600);
  if (!rl.ok) return { message: "Please try again later." };

  const productId = String(fd.get("productId") ?? "");
  const rating = Number.parseInt(String(fd.get("rating") ?? ""), 10);
  const title = String(fd.get("title") ?? "").trim().slice(0, 120);
  const body = String(fd.get("body") ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { errors: { rating: "Choose a rating from 1 to 5" } };
  if (body.length < 10 || body.length > 2000) return { errors: { body: "Write between 10 and 2000 characters" } };

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { message: "Product not found." };

  // Only people who actually bought the product can review it, so reviews stay genuine.
  const purchased = await db.orderItem.count({
    where: {
      productId: product.id,
      order: { userId: user.id, status: { in: ["PAID", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] } },
    },
  });
  if (purchased === 0) return { message: "Only customers who have bought this product can review it." };

  const first = user.name.trim().split(/\s+/);
  const authorName = first.length > 1 ? `${first[0]} ${first[first.length - 1][0]}.` : first[0];
  await db.review.upsert({
    where: { productId_userId: { productId: product.id, userId: user.id } },
    update: { rating, title: title || null, body, status: "PENDING", verifiedPurchase: true },
    create: { productId: product.id, userId: user.id, authorName, rating, title: title || null, body, verifiedPurchase: true },
  });
  revalidateTag("catalog");
  return { ok: true, message: "Thank you! Your review will appear after moderation." };
}
