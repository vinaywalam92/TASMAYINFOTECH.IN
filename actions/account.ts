"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addItem } from "@/lib/cart";
import { cancelOrder } from "@/lib/orders";
import { refundOrder } from "@/lib/refunds";
import { audit } from "@/lib/audit";
import { addressSchema, fieldErrors, formDataToObject, phoneSchema, type ActionState } from "@/lib/validators";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.union([phoneSchema, z.literal("").transform(() => undefined)]).optional(),
});

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/account/profile");
  const raw = formDataToObject(fd);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone ?? null } });
  revalidatePath("/account", "layout");
  return { ok: true, message: "Profile updated." };
}

const addressFormSchema = addressSchema.extend({
  label: z.string().trim().max(40).optional().default(""),
  isDefault: z.string().optional(),
  id: z.string().max(40).optional(),
});

export async function saveAddressAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/account/addresses");
  const raw = formDataToObject(fd);
  const parsed = addressFormSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };
  const { id, isDefault, ...rest } = parsed.data;
  const data = { ...rest, label: rest.label || null, line2: rest.line2 || null, isDefault: !!isDefault };

  try {
    await db.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId: user.id } });
      if (data.isDefault || (!id && count === 0)) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
        data.isDefault = true;
      }
      if (id) {
        const own = await tx.address.findFirst({ where: { id, userId: user.id } });
        if (!own) throw new Error("Address not found");
        await tx.address.update({ where: { id }, data });
      } else {
        if (count >= 15) throw new Error("You can save up to 15 addresses.");
        await tx.address.create({ data: { ...data, userId: user.id } });
      }
    });
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Could not save the address.", values: raw };
  }
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddressAction(fd: FormData) {
  const user = await requireUser("/account/addresses");
  const id = String(fd.get("id") ?? "");
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/addresses");
}

/** Put every available item of a past order back in the cart, then go to the cart. */
export async function reorderAction(fd: FormData) {
  const user = await requireUser("/account/orders");
  const orderNumber = String(fd.get("orderNumber") ?? "");
  const order = await db.order.findFirst({ where: { orderNumber, userId: user.id }, include: { items: true } });
  if (!order) redirect("/account/orders");
  for (const it of order.items) {
    if (it.productId) await addItem(it.productId, it.quantity); // skips unavailable / clamps to stock
  }
  redirect("/cart");
}

/** Customers may cancel before the order is packed. Paid orders are refunded through the gateway. */
export async function cancelMyOrderAction(fd: FormData) {
  const user = await requireUser("/account/orders");
  const orderNumber = String(fd.get("orderNumber") ?? "");
  const order = await db.order.findFirst({ where: { orderNumber, userId: user.id } });
  if (!order) redirect("/account/orders");
  if (!["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(order.status)) {
    redirect(`/account/orders/${orderNumber}?error=cancel`);
  }
  const wasPaid = order.status !== "PENDING_PAYMENT";
  const res = await cancelOrder(order.id, "Cancelled by the customer.");
  if (res.ok && wasPaid) await refundOrder(order.id, "customer cancellation");
  await audit(user.id, "order.customer_cancelled", "Order", order.id);
  revalidatePath(`/account/orders/${orderNumber}`);
  redirect(`/account/orders/${orderNumber}?cancelled=1`);
}
