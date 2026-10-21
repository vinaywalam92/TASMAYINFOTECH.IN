import { describe, expect, it } from "vitest";
import { computeTotals, couponProblem, exclFromIncl, inclFromExcl } from "./pricing";

const line = (productId: string, unitPaise: number, qty: number, gstRate = 18) => ({ productId, unitPaise, qty, gstRate });

describe("computeTotals", () => {
  it("GST-inclusive: total equals listed prices, tax is extracted", () => {
    const t = computeTotals([line("a", 11800, 1)], { gstInclusive: true });
    expect(t.totalPaise).toBe(11800);
    expect(t.taxPaise).toBe(1800);
  });

  it("GST-exclusive: tax is added on top", () => {
    const t = computeTotals([line("a", 10000, 2)], { gstInclusive: false });
    expect(t.subtotalPaise).toBe(20000);
    expect(t.taxPaise).toBe(3600);
    expect(t.totalPaise).toBe(23600);
  });

  it("adds shipping to the total without taxing it again", () => {
    const t = computeTotals([line("a", 11800, 1)], { gstInclusive: true, shippingPaise: 9900 });
    expect(t.totalPaise).toBe(21700);
    expect(t.taxPaise).toBe(1800);
  });

  it("percent coupon is capped by maxDiscountPaise and fully allocated across lines", () => {
    const t = computeTotals([line("a", 10000, 1), line("b", 5000, 1, 12), line("c", 3333, 1, 5)], {
      gstInclusive: true,
      coupon: { code: "X", type: "PERCENT", value: 50, minOrderPaise: 0, maxDiscountPaise: 5000 },
    });
    expect(t.discountPaise).toBe(5000);
    expect(t.lines.reduce((s, l) => s + l.discountPaise, 0)).toBe(5000);
    expect(t.totalPaise).toBe(10000 + 5000 + 3333 - 5000);
  });

  it("flat coupon never exceeds the subtotal", () => {
    const t = computeTotals([line("a", 1000, 1)], {
      gstInclusive: true,
      coupon: { code: "BIG", type: "FLAT", value: 999999, minOrderPaise: 0, maxDiscountPaise: null },
    });
    expect(t.discountPaise).toBe(1000);
    expect(t.totalPaise).toBe(0);
  });

  it("ignores a coupon below its minimum order", () => {
    const t = computeTotals([line("a", 1000, 1)], {
      gstInclusive: true,
      coupon: { code: "MIN", type: "FLAT", value: 100, minOrderPaise: 5000, maxDiscountPaise: null },
    });
    expect(t.discountPaise).toBe(0);
  });
});

describe("couponProblem", () => {
  const base = { isActive: true, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0, minOrderPaise: 0 };
  const now = new Date("2026-06-01T00:00:00Z");

  it("accepts a valid coupon", () => expect(couponProblem(base, 1000, now)).toBeNull());
  it("rejects inactive, expired, future and exhausted coupons", () => {
    expect(couponProblem({ ...base, isActive: false }, 1000, now)).toMatch(/not active/);
    expect(couponProblem({ ...base, endsAt: new Date("2026-05-01") }, 1000, now)).toMatch(/expired/);
    expect(couponProblem({ ...base, startsAt: new Date("2026-07-01") }, 1000, now)).toMatch(/not valid yet/);
    expect(couponProblem({ ...base, usageLimit: 3, usedCount: 3 }, 1000, now)).toMatch(/limit/);
  });
  it("tells the shopper how much more to add", () => {
    expect(couponProblem({ ...base, minOrderPaise: 50000 }, 40000, now)).toMatch(/₹100/);
  });
});

describe("GST conversions", () => {
  it("round-trips common slabs", () => {
    expect(inclFromExcl(10000, 18)).toBe(11800);
    expect(exclFromIncl(11800, 18)).toBe(10000);
    expect(inclFromExcl(10000, 5)).toBe(10500);
  });
});
