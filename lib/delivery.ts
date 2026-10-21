import "server-only";
import type { ShippingRule } from "@prisma/client";
import { db } from "@/lib/db";
import { hideDemo } from "@/lib/catalog";
import type { SiteSettings } from "@/lib/settings";

/**
 * Delivery policy engine. Everything here is POLICY-BASED: rules come from Admin → Shipping and
 * settings (cut-off, working days, holidays). Nothing is fetched from a courier, so the UI must
 * label results as estimates, never as live or guaranteed delivery dates.
 */

// ───────────────────────── rule lookup ─────────────────────────

/**
 * Best matching active rule for a PIN: the longest matching PIN prefix wins; ties go to the lowest
 * sortOrder. A rule with no prefixes is the fallback for every other PIN.
 */
export async function findShippingRule(pin: string): Promise<ShippingRule | null> {
  const rules = await db.shippingRule.findMany({
    where: { isActive: true, ...(hideDemo() ? { isDemo: false } : {}) },
    orderBy: { sortOrder: "asc" },
  });
  let best: { rule: ShippingRule; score: number } | null = null;
  for (const rule of rules) {
    let score = -1;
    if (rule.pincodePrefixes.length === 0) score = 0;
    else {
      const matched = rule.pincodePrefixes.filter((p) => pin.startsWith(p));
      if (matched.length) score = Math.max(...matched.map((p) => p.length));
    }
    if (score < 0) continue;
    if (!best || score > best.score) best = { rule, score }; // equal score keeps earlier (lower sortOrder)
  }
  return best?.rule ?? null;
}

export type ShippingQuote =
  | { status: "unconfigured" }
  | { status: "unserviceable"; ruleName: string; note: string | null }
  | {
      status: "ok";
      ruleName: string;
      feePaise: number;
      free: boolean;
      freeAbovePaise: number | null;
      minDays: number;
      maxDays: number;
      note: string | null;
    };

/** `itemsAfterDiscountPaise` is what the free-delivery threshold is compared against. */
export async function quoteShipping(pin: string, itemsAfterDiscountPaise: number): Promise<ShippingQuote> {
  const rule = await findShippingRule(pin);
  if (!rule) return { status: "unconfigured" };
  if (!rule.serviceable) return { status: "unserviceable", ruleName: rule.name, note: rule.note };
  const free = rule.freeAbovePaise !== null && itemsAfterDiscountPaise >= rule.freeAbovePaise;
  return {
    status: "ok",
    ruleName: rule.name,
    feePaise: free ? 0 : rule.feePaise,
    free,
    freeAbovePaise: rule.freeAbovePaise,
    minDays: rule.etaMinDays,
    maxDays: Math.max(rule.etaMinDays, rule.etaMaxDays),
    note: rule.note,
  };
}

// ───────────────────────── business-day maths (IST calendar) ─────────────────────────

type CalendarSettings = Pick<SiteSettings, "workingDays" | "holidays" | "cutoffHour" | "handlingDays">;

function istParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), hour: get("hour") };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function isWorkingDay(d: Date, s: Pick<CalendarSettings, "workingDays" | "holidays">) {
  return s.workingDays.includes(d.getUTCDay()) && !s.holidays.includes(iso(d));
}

function addBusinessDays(d: Date, n: number, s: Pick<CalendarSettings, "workingDays" | "holidays">) {
  let cur = d;
  let left = n;
  let guard = 0;
  while (left > 0 && guard++ < 400) {
    cur = addDays(cur, 1);
    if (isWorkingDay(cur, s)) left--;
  }
  return cur;
}

export type DeliveryEstimate = { dispatchDate: string; minDate: string; maxDate: string };

/** Estimate assuming payment is confirmed at `from`. Dates are ISO yyyy-mm-dd on the IST calendar. */
export function estimateDelivery(
  rule: { minDays: number; maxDays: number },
  settings: CalendarSettings,
  from = new Date(),
): DeliveryEstimate {
  // Misconfiguration guard: no working days at all → treat every day as working.
  const s = settings.workingDays.length ? settings : { ...settings, workingDays: [0, 1, 2, 3, 4, 5, 6] };
  const p = istParts(from);
  const today = new Date(Date.UTC(p.y, p.m - 1, p.d));
  let dispatch = today;
  if (!(isWorkingDay(today, s) && p.hour < s.cutoffHour)) dispatch = addBusinessDays(today, 1, s);
  dispatch = addBusinessDays(dispatch, s.handlingDays, s);
  return {
    dispatchDate: iso(dispatch),
    minDate: iso(addBusinessDays(dispatch, rule.minDays, s)),
    maxDate: iso(addBusinessDays(dispatch, rule.maxDays, s)),
  };
}

export function formatIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatEstimateRange(e: { minDate: string; maxDate: string }): string {
  return e.minDate === e.maxDate ? formatIsoDate(e.minDate) : `${formatIsoDate(e.minDate)} – ${formatIsoDate(e.maxDate)}`;
}
