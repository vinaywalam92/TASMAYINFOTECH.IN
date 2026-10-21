import "server-only";
import { db } from "./db";

export type ShippingQuote =
  | { configured: false }
  | {
      configured: true;
      ruleName: string;
      feePaise: number;
      freeAbovePaise: number | null;
      etaMinDays: number | null;
      etaMaxDays: number | null;
      note: string | null;
    };

/**
 * Picks the most specific active rule for a PIN (longest matching prefix), falling back to the
 * rule(s) with no prefixes. Returns `configured:false` if the admin has not set up any rule.
 */
export async function findShippingRule(pincode: string): Promise<ShippingQuote> {
  const rules = await db.shippingRule.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  let best: (typeof rules)[number] | undefined;
  let bestLen = -1;
  for (const r of rules) {
    if (r.pincodePrefixes.length === 0) {
      if (bestLen < 0) { best = r; bestLen = 0; }
      continue;
    }
    for (const p of r.pincodePrefixes) {
      if (pincode.startsWith(p) && p.length > bestLen) { best = r; bestLen = p.length; }
    }
  }
  if (!best) return { configured: false };
  return {
    configured: true,
    ruleName: best.name,
    feePaise: best.feePaise,
    freeAbovePaise: best.freeAbovePaise,
    etaMinDays: best.etaMinDays,
    etaMaxDays: best.etaMaxDays,
    note: best.note,
  };
}

/** Delivery fee for a given order value (after discount). */
export function shippingFee(q: ShippingQuote, orderValuePaise: number): number {
  if (!q.configured) return 0;
  if (q.freeAbovePaise != null && orderValuePaise >= q.freeAbovePaise) return 0;
  return q.feePaise;
}

/** Adds business days (Mon–Sat; Sunday skipped) in IST-agnostic fashion. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return d;
}
