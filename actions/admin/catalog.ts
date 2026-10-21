"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseSpecs } from "@/lib/catalog";
import { slugify } from "@/lib/utils";
import { bool, flash, int, paise, str } from "@/lib/admin-helpers";

const bust = () => { revalidateTag("catalog"); revalidatePath("/", "layout"); };

export async function saveProductAction(fd: FormData) {
  const user = await assertPermission("catalog:write");
  const id = str(fd, "id", 40);
  const back = id ? `/admin/products/${id}` : "/admin/products/new";
  const name = str(fd, "name", 200);
  const sku = str(fd, "sku", 60);
  const price = paise(fd, "price");
  const categoryId = str(fd, "categoryId", 40);
  if (!name || !sku || price == null || price <= 0 || !categoryId) flash(back, "error", "Name, SKU, category and a price above 0 are required.");
  const mrp = paise(fd, "mrp");
  const gstRate = int(fd, "gstRate", 18);
  if (![0, 5, 12, 18, 28].includes(gstRate)) flash(back, "error", "GST rate must be 0, 5, 12, 18 or 28.");
  const { specs, attributes } = parseSpecs(str(fd, "specs", 4000));
  const slug = slugify(str(fd, "slug", 120) || name);
  const data = {
    name, sku, slug,
    model: str(fd, "model", 100) || null,
    description: str(fd, "description", 8000),
    brandId: str(fd, "brandId", 40) || null,
    categoryId,
    pricePaise: price!,
    mrpPaise: mrp,
    gstRate,
    hsnCode: str(fd, "hsnCode", 20) || null,
    lowStockThreshold: Math.max(0, int(fd, "lowStockThreshold", 5)),
    specs, attributes,
    compatibility: str(fd, "compatibility", 1000) || null,
    warrantyInfo: str(fd, "warrantyInfo", 1000) || null,
    isActive: bool(fd, "isActive"),
    isFeatured: bool(fd, "isFeatured"),
  };
  const images = str(fd, "images", 4000).split(/\n/).map((s) => s.trim()).filter((u) => /^https:\/\//i.test(u)).slice(0, 10);
  try {
    let pid = id;
    if (id) {
      await db.$transaction([
        db.product.update({ where: { id }, data }),
        db.productImage.deleteMany({ where: { productId: id } }),
        db.productImage.createMany({ data: images.map((url, i) => ({ productId: id, url, sortOrder: i })) }),
      ]);
    } else {
      const stock = Math.max(0, int(fd, "stock", 0));
      const p = await db.product.create({ data: { ...data, stock, images: { create: images.map((url, i) => ({ url, sortOrder: i })) } } });
      pid = p.id;
      if (stock > 0) await db.inventoryAdjustment.create({ data: { productId: p.id, delta: stock, reason: "Opening stock", actorId: user.id } });
    }
    await audit(user.id, id ? "product.update" : "product.create", "Product", pid);
    bust();
    flash(`/admin/products/${pid}`, "saved");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
    flash(back, "error", "Could not save. SKU and URL slug must be unique.");
  }
}

export async function adjustStockAction(fd: FormData) {
  const user = await assertPermission("inventory:write");
  const productId = str(fd, "productId", 40);
  const delta = int(fd, "delta", 0);
  const reason = str(fd, "reason", 200);
  const back = str(fd, "back", 100) || "/admin/inventory";
  if (!delta || !reason) flash(back, "error", "Enter a non-zero change and a reason.");
  const res = await db.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!p) return "Product not found";
    if (p.stock + delta < 0) return "Stock cannot go below zero.";
    await tx.product.update({ where: { id: productId }, data: { stock: { increment: delta } } });
    await tx.inventoryAdjustment.create({ data: { productId, delta, reason, actorId: user.id } });
    return null;
  });
  if (res) flash(back, "error", res);
  await audit(user.id, "inventory.adjust", "Product", productId, { delta, reason });
  bust();
  flash(back, "saved");
}

export async function saveCategoryAction(fd: FormData) {
  const user = await assertPermission("catalog:write");
  const id = str(fd, "id", 40);
  const name = str(fd, "name", 100);
  if (!name) flash("/admin/categories", "error", "Name is required.");
  const data = {
    name, slug: slugify(str(fd, "slug", 100) || name),
    description: str(fd, "description", 500) || null,
    parentId: str(fd, "parentId", 40) || null,
    iconKey: str(fd, "iconKey", 30) || null,
    sortOrder: int(fd, "sortOrder", 0),
    isActive: bool(fd, "isActive"),
  };
  if (data.parentId && data.parentId === id) flash("/admin/categories", "error", "A category cannot be its own parent.");
  try {
    const c = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
    await audit(user.id, id ? "category.update" : "category.create", "Category", c.id);
  } catch { flash("/admin/categories", "error", "Could not save. The slug must be unique."); }
  bust();
  flash("/admin/categories", "saved");
}

export async function saveBrandAction(fd: FormData) {
  const user = await assertPermission("catalog:write");
  const id = str(fd, "id", 40);
  const name = str(fd, "name", 100);
  if (!name) flash("/admin/brands", "error", "Name is required.");
  const logo = str(fd, "logoUrl", 500);
  const data = { name, slug: slugify(str(fd, "slug", 100) || name), logoUrl: /^https:\/\//i.test(logo) ? logo : null, website: str(fd, "website", 300) || null, isActive: bool(fd, "isActive") };
  try {
    const b = id ? await db.brand.update({ where: { id }, data }) : await db.brand.create({ data });
    await audit(user.id, id ? "brand.update" : "brand.create", "Brand", b.id);
  } catch { flash("/admin/brands", "error", "Could not save. Name and slug must be unique."); }
  bust();
  flash("/admin/brands", "saved");
}
