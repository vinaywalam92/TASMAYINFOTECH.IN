import { NextResponse } from "next/server";
import { currentCartView, EMPTY_CART } from "@/lib/cart";

export const dynamic = "force-dynamic";

/** Current cart (server-authoritative prices, stock, coupon, shipping, GST). Read-only. */
export async function GET() {
  try {
    return NextResponse.json(await currentCartView(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/cart]", err instanceof Error ? err.message : err);
    return NextResponse.json(EMPTY_CART, { headers: { "Cache-Control": "no-store" } });
  }
}
