import { NextResponse } from "next/server";
import { quoteShipping, estimateDelivery, formatEstimateRange } from "@/lib/delivery";
import { getSettings } from "@/lib/settings";
import { PIN_REGEX } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFromRequest } from "@/lib/request";

export const dynamic = "force-dynamic";

export type DeliveryEstimateResponse =
  | { status: "invalid"; message: string }
  | { status: "unconfigured"; message: string }
  | { status: "unserviceable"; message: string }
  | {
      status: "ok";
      message: string;
      range: string;
      dispatchDate: string;
      minDate: string;
      maxDate: string;
      feePaise: number;
      freeAbovePaise: number | null;
      ruleName: string;
      note: string | null;
    };

/** Policy-based estimate (configured in Admin → Shipping). It is NOT live courier data. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const pin = (sp.get("pin") ?? "").trim();
  const value = Math.max(0, Number.parseInt(sp.get("value") ?? "0", 10) || 0); // paise, for free-delivery check

  if (!PIN_REGEX.test(pin)) {
    return NextResponse.json<DeliveryEstimateResponse>({ status: "invalid", message: "Enter a valid 6-digit PIN code." }, { status: 400 });
  }
  const rl = await rateLimit(`deliv:${clientIpFromRequest(req)}`, 60, 60);
  if (!rl.ok) return NextResponse.json<DeliveryEstimateResponse>({ status: "invalid", message: "Too many requests. Try again shortly." }, { status: 429 });

  const [quote, settings] = await Promise.all([quoteShipping(pin, value), getSettings()]);
  if (quote.status === "unconfigured") {
    return NextResponse.json<DeliveryEstimateResponse>({
      status: "unconfigured",
      message: "Delivery details for this PIN code have not been published yet. Please contact us for an estimate.",
    });
  }
  if (quote.status === "unserviceable") {
    return NextResponse.json<DeliveryEstimateResponse>({
      status: "unserviceable",
      message: quote.note || "We do not currently deliver to this PIN code.",
    });
  }
  const est = estimateDelivery(quote, settings);
  return NextResponse.json<DeliveryEstimateResponse>({
    status: "ok",
    message: "Estimated delivery if you order now (policy estimate, not a courier guarantee).",
    range: formatEstimateRange(est),
    ...est,
    feePaise: quote.feePaise,
    freeAbovePaise: quote.freeAbovePaise,
    ruleName: quote.ruleName,
    note: quote.note,
  });
}
