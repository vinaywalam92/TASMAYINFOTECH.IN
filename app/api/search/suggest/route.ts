import { NextResponse } from "next/server";
import { searchSuggestions } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFromRequest } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const rl = await rateLimit(`suggest:${clientIpFromRequest(req)}`, 120, 60);
  if (!rl.ok) return NextResponse.json({ suggestions: [] }, { status: 429 });

  try {
    return NextResponse.json({ suggestions: await searchSuggestions(q) }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[api/search/suggest]", err instanceof Error ? err.message : err);
    return NextResponse.json({ suggestions: [] });
  }
}
