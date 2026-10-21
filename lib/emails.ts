import "server-only";
import { SITE_URL } from "@/lib/constants";
import { inrExact } from "@/lib/format";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0e121e">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-weight:800;letter-spacing:.14em;font-size:14px;color:#2f6bff;margin-bottom:16px">TASMAY INFOTECH</div>
    <div style="background:#fff;border-radius:14px;padding:28px;border:1px solid #e5e9f2">
      <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#6b7390;margin-top:16px">This is an automated message from ${SITE_URL.replace(/^https?:\/\//, "")}.</p>
  </div></body></html>`;
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: "Reset your TASMAY INFOTECH password",
    html: shell(
      "Reset your password",
      `<p>Hi ${esc(name)},</p><p>We received a request to reset your password. This link works once and expires in 60 minutes.</p>
       <p><a href="${esc(link)}" style="display:inline-block;background:#2f6bff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Choose a new password</a></p>
       <p style="font-size:13px;color:#6b7390">If you did not ask for this, you can ignore this email; your password will not change.</p>`,
    ),
    text: `Hi ${name},\n\nReset your password (valid 60 minutes, single use):\n${link}\n\nIf you did not request this, ignore this email.`,
  };
}

export function newsletterConfirmEmail(link: string) {
  return {
    subject: "Confirm your TASMAY INFOTECH newsletter subscription",
    html: shell(
      "Confirm your subscription",
      `<p>Please confirm that you want to receive product news and offers from TASMAY INFOTECH.</p>
       <p><a href="${esc(link)}" style="display:inline-block;background:#2f6bff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Confirm subscription</a></p>
       <p style="font-size:13px;color:#6b7390">If you did not sign up, ignore this email and you will not be subscribed.</p>`,
    ),
    text: `Confirm your newsletter subscription:\n${link}\n\nIf you did not sign up, ignore this email.`,
  };
}

export type OrderEmailData = {
  orderNumber: string;
  name: string;
  items: { name: string; quantity: number; lineGrossPaise: number }[];
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  trackUrl: string;
};

export function orderConfirmationEmail(o: OrderEmailData) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.name)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${inrExact(i.lineGrossPaise)}</td></tr>`,
    )
    .join("");
  return {
    subject: `Order ${o.orderNumber} confirmed - TASMAY INFOTECH`,
    html: shell(
      `Thank you, ${o.name}. Your payment is confirmed.`,
      `<p>Order <strong>${esc(o.orderNumber)}</strong> is confirmed and will be processed shortly.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
         ${o.discountPaise ? `<tr><td style="padding:6px 0">Discount</td><td style="text-align:right">- ${inrExact(o.discountPaise)}</td></tr>` : ""}
         <tr><td style="padding:6px 0">Delivery</td><td style="text-align:right">${o.shippingPaise ? inrExact(o.shippingPaise) : "Free"}</td></tr>
         <tr><td style="padding:10px 0;border-top:1px solid #e5e9f2"><strong>Total paid (incl. GST)</strong></td><td style="padding:10px 0;border-top:1px solid #e5e9f2;text-align:right"><strong>${inrExact(o.totalPaise)}</strong></td></tr>
       </table>
       <p><a href="${esc(o.trackUrl)}" style="display:inline-block;background:#2f6bff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Track your order</a></p>`,
    ),
    text: `Order ${o.orderNumber} confirmed.\n\n${o.items.map((i) => `${i.name} x ${i.quantity}  ${inrExact(i.lineGrossPaise)}`).join("\n")}\n\nTotal paid (incl. GST): ${inrExact(o.totalPaise)}\nTrack: ${o.trackUrl}`,
  };
}

export function orderStatusEmail(orderNumber: string, statusLabel: string, note: string | null, trackUrl: string) {
  return {
    subject: `Order ${orderNumber}: ${statusLabel}`,
    html: shell(
      `Your order is now: ${statusLabel}`,
      `<p>Order <strong>${esc(orderNumber)}</strong> has been updated.</p>${note ? `<p>${esc(note)}</p>` : ""}
       <p><a href="${esc(trackUrl)}" style="display:inline-block;background:#2f6bff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">View order status</a></p>`,
    ),
    text: `Order ${orderNumber} is now: ${statusLabel}.${note ? `\n${note}` : ""}\n${trackUrl}`,
  };
}

export function internalNotification(subject: string, lines: Record<string, string | undefined>) {
  const entries = Object.entries(lines).filter(([, v]) => v);
  return {
    subject,
    html: shell(subject, `<table style="font-size:14px">${entries.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7390;vertical-align:top">${esc(k)}</td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>`),
    text: entries.map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}
