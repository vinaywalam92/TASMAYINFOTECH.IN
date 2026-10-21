import { db } from "@/lib/db";
import { can, getCurrentUser } from "@/lib/auth";
import { verifyOrderAccess } from "@/lib/order-access";
import { getSettings } from "@/lib/settings";
import { esc } from "@/lib/emails";
import { inrExact, formatDate } from "@/lib/format";
import { GST_STATES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Addr = { name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; phone?: string };

function addrHtml(a: Addr) {
  return [a.name, a.line1, a.line2, [a.city, a.state, a.pincode].filter(Boolean).join(", "), a.phone ? `Mobile: ${a.phone}` : ""]
    .filter(Boolean)
    .map((l) => esc(l))
    .join("<br>");
}

const stateCode = (name?: string) => {
  const n = (name ?? "").toLowerCase().replace(/&/g, "and");
  return GST_STATES.find((s) => s.name.toLowerCase().replace(/&/g, "and") === n)?.code ?? "";
};

/**
 * Printable invoice (open → Print → Save as PDF). Access: the owning customer, staff with order
 * permission, or a holder of the signed link token. Missing and forbidden look identical (404).
 */
export async function GET(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");

  const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true, payments: true } });
  const user = await getCurrentUser();
  const allowed = !!order && ((user && order.userId === user.id) || can(user?.role, "orders:write") || verifyOrderAccess(orderNumber, token));
  if (!order || !allowed) return new Response("Not found", { status: 404 });
  if (order.status === "PENDING_PAYMENT" || order.status === "CANCELLED") {
    return new Response("An invoice is available once payment is confirmed.", { status: 409 });
  }

  const s = await getSettings();
  const isTaxInvoice = !!s.gstin;
  const ship = order.shippingAddress as Addr;
  const bill = order.billingAddress as Addr;
  const sameState = !!s.sellerStateCode && stateCode(bill.state) === s.sellerStateCode;

  const rows = order.items.map((it, i) => ({
    n: i + 1,
    name: it.name,
    sku: it.sku,
    hsn: it.hsnCode ?? "",
    qty: it.quantity,
    rate: it.unitPricePaise,
    taxable: it.lineTotalPaise - it.taxPaise,
    gstRate: it.gstRate,
    gst: it.taxPaise,
    total: it.lineTotalPaise,
  }));
  const totalGst = order.taxPaise;
  const split = s.sellerStateCode
    ? sameState
      ? `CGST ${inrExact(Math.floor(totalGst / 2))} + SGST ${inrExact(totalGst - Math.floor(totalGst / 2))}`
      : `IGST ${inrExact(totalGst)}`
    : `GST ${inrExact(totalGst)}`;
  const paidAt = order.paidAt ?? order.createdAt;
  const pay = order.payments.find((p) => p.status === "PAID" || p.status === "REFUNDED");
  const itemsTotal = order.totalPaise - order.shippingPaise;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>${isTaxInvoice ? "Tax Invoice" : "Order Receipt"} ${esc(order.orderNumber)}</title>
<style>
 body{font:14px/1.5 Arial,Helvetica,sans-serif;color:#111;margin:0;background:#f3f4f8}
 .page{max-width:820px;margin:24px auto;background:#fff;padding:36px;border:1px solid #dde1ea}
 h1{font-size:22px;margin:0 0 4px} .muted{color:#666} .row{display:flex;gap:24px;justify-content:space-between;flex-wrap:wrap}
 table{width:100%;border-collapse:collapse;margin:18px 0} th,td{border-bottom:1px solid #e3e6ee;padding:8px 6px;text-align:left;vertical-align:top;font-size:13px}
 th{background:#f6f7fb;font-size:12px;text-transform:uppercase;letter-spacing:.04em} td.r,th.r{text-align:right}
 .tot td{border:0;padding:3px 6px} .big td{font-weight:700;font-size:15px;border-top:2px solid #111;padding-top:8px}
 .btn{display:inline-block;margin:0 0 12px;padding:8px 14px;background:#2f6bff;color:#fff;border-radius:8px;cursor:pointer;border:0;font-size:13px}
 @media print{body{background:#fff}.page{border:0;margin:0}.noprint{display:none}}
</style></head><body><div class="page">
<div class="noprint"><button class="btn" onclick="window.print()">Print / Save as PDF</button></div>
<div class="row"><div>
  <h1>${isTaxInvoice ? "Tax Invoice" : "Order Receipt"}</h1>
  <div class="muted">No. ${esc(order.orderNumber)} · ${esc(formatDate(paidAt))}</div>
 </div>
 <div style="text-align:right"><strong>${esc(s.legalName || s.businessName)}</strong><br>
  ${s.address ? esc(s.address).replace(/\n/g, "<br>") + "<br>" : ""}
  ${s.gstin ? "GSTIN: " + esc(s.gstin) + "<br>" : ""}
  ${s.email ? esc(s.email) + "<br>" : ""}${s.phone ? esc(s.phone) : ""}
 </div></div>
<div class="row" style="margin-top:18px">
 <div><strong>Billed to</strong><br>${addrHtml(bill)}${order.gstin ? `<br>GSTIN: ${esc(order.gstin)}` : ""}</div>
 <div><strong>Shipped to</strong><br>${addrHtml(ship)}</div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="r">Qty</th><th class="r">Rate (${order.gstInclusive ? "incl." : "excl."} GST)</th><th class="r">Taxable</th><th class="r">GST</th><th class="r">Amount</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${r.n}</td><td>${esc(r.name)}<br><span class="muted">SKU ${esc(r.sku)}</span></td><td>${esc(r.hsn)}</td><td class="r">${r.qty}</td><td class="r">${inrExact(r.rate)}</td><td class="r">${inrExact(r.taxable)}</td><td class="r">${r.gstRate}%<br>${inrExact(r.gst)}</td><td class="r">${inrExact(r.total)}</td></tr>`).join("")}
${order.shippingPaise ? `<tr><td></td><td>Delivery charges</td><td></td><td class="r">1</td><td class="r" colspan="3"></td><td class="r">${inrExact(order.shippingPaise)}</td></tr>` : ""}
</tbody></table>
<table class="tot" style="width:320px;margin-left:auto">
 <tr><td>Items (after discount, incl. GST)</td><td class="r">${inrExact(itemsTotal)}</td></tr>
 ${order.discountPaise ? `<tr><td class="muted">Coupon discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""} already applied</td><td class="r">- ${inrExact(order.discountPaise)}</td></tr>` : ""}
 <tr><td>Delivery</td><td class="r">${order.shippingPaise ? inrExact(order.shippingPaise) : "Free"}</td></tr>
 <tr class="big"><td>Total paid</td><td class="r">${inrExact(order.totalPaise)}</td></tr>
 <tr><td class="muted" colspan="2">Items include ${split}</td></tr>
</table>
<p class="muted">${pay ? `Paid online via payment gateway${pay.gatewayMethod ? " (" + esc(pay.gatewayMethod) + ")" : ""}. ` : ""}${isTaxInvoice ? "" : "This document is an order receipt, not a GST tax invoice (seller GSTIN not configured). "}This is a computer-generated document.</p>
</div></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
