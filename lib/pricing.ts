/**
 * Pure pricing / GST maths. No DB access — used by the cart view and by order creation so both agree.
 *
 * All values are integer paise. `gstInclusive` mirrors the site pricing policy:
 *  - true : listed prices already include GST (tax is extracted for display)
 *  - false: listed prices exclude GST (tax is added on top)
 *
 * Shipping is treated as a flat charge (no separate GST split). Confirm treatment with your CA.
 */

export type PricedLine = { productId: string; unitPaise: number; qty: number; gstRate: number };

export type LineResult = PricedLine & {
  grossPaise: number; // unit × qty as listed
  discountPaise: number; // allocated coupon discount
  taxPaise: number;
  lineTotalPaise: number; // amount the customer pays for this line
};

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
};

export function couponDiscount(rule: CouponRule, subtotalPaise: number): number {
  let d = rule.type === "PERCENT" ? Math.floor((subtotalPaise * rule.value) / 100) : rule.value;
  if (rule.maxDiscountPaise != null) d = Math.min(d, rule.maxDiscountPaise);
  return Math.max(0, Math.min(d, subtotalPaise));
}

export function computeTotals(
  lines: PricedLine[],
  opts: { gstInclusive: boolean; coupon?: CouponRule | null; shippingPaise?: number },
) {
  const subtotalPaise = lines.reduce((s, l) => s + l.unitPaise * l.qty, 0);
  const discountPaise = opts.coupon && subtotalPaise >= opts.coupon.minOrderPaise ? couponDiscount(opts.coupon, subtotalPaise) : 0;

  let allocated = 0;
  const results: LineResult[] = lines.map((l, i) => {
    const grossPaise = l.unitPaise * l.qty;
    const alloc =
      i === lines.length - 1
        ? discountPaise - allocated
        : subtotalPaise === 0
          ? 0
          : Math.round((discountPaise * grossPaise) / subtotalPaise);
    allocated += alloc;
    const net = grossPaise - alloc;
    let taxPaise: number;
    let lineTotalPaise: number;
    if (opts.gstInclusive) {
      taxPaise = net - Math.round((net * 100) / (100 + l.gstRate));
      lineTotalPaise = net;
    } else {
      taxPaise = Math.round((net * l.gstRate) / 100);
      lineTotalPaise = net + taxPaise;
    }
    return { ...l, grossPaise, discountPaise: alloc, taxPaise, lineTotalPaise };
  });

  const taxPaise = results.reduce((s, l) => s + l.taxPaise, 0);
  const itemsTotal = results.reduce((s, l) => s + l.lineTotalPaise, 0);
  const shippingPaise = opts.shippingPaise ?? 0;
  return {
    lines: results,
    subtotalPaise,
    discountPaise,
    taxPaise,
    shippingPaise,
    totalPaise: itemsTotal + shippingPaise,
  };
}

/** Why a coupon can't be used right now (null = usable). */
export function couponProblem(
  c: { isActive: boolean; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null; usedCount: number; minOrderPaise: number },
  subtotalPaise: number,
  now = new Date(),
): string | null {
  if (!c.isActive) return "This coupon is not active.";
  if (c.startsAt && c.startsAt > now) return "This coupon is not valid yet.";
  if (c.endsAt && c.endsAt < now) return "This coupon has expired.";
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "This coupon has reached its usage limit.";
  if (subtotalPaise < c.minOrderPaise) return `Add items worth ₹${Math.ceil((c.minOrderPaise - subtotalPaise) / 100)} more to use this coupon.`;
  return null;
}

// ───────────────────────── display helpers ─────────────────────────

/** GST-inclusive amount from an exclusive one (rounded to the nearest paisa). */
export const inclFromExcl = (exclPaise: number, gstRate: number) => Math.round((exclPaise * (100 + gstRate)) / 100);

/** GST-exclusive amount from an inclusive one. */
export const exclFromIncl = (inclPaise: number, gstRate: number) => Math.round((inclPaise * 100) / (100 + gstRate));

/** What a customer pays per unit, including GST, given the store's pricing mode. */
export const unitInclPaise = (listedPaise: number, gstRate: number, gstInclusive: boolean) =>
  gstInclusive ? listedPaise : inclFromExcl(listedPaise, gstRate);

/** Short label shown next to listed prices. */
export const priceLabel = (gstInclusive: boolean) => (gstInclusive ? "Incl. GST" : "Excl. GST");
