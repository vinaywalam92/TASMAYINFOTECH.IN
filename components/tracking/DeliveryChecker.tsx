"use client";

import { useState } from "react";
import { inr } from "@/lib/format";
import type { DeliveryEstimateResponse } from "@/app/api/delivery/estimate/route";

export function DeliveryChecker() {
  const [pin, setPin] = useState("");
  const [r, setR] = useState<DeliveryEstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="glass space-y-4 rounded-2xl p-6" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { setR(await (await fetch(`/api/delivery/estimate?pin=${pin}`)).json()); } catch { setR({ status: "invalid", message: "Could not check right now." }); }
      setBusy(false);
    }}>
      <label htmlFor="dt-pin" className="label">PIN code</label>
      <div className="flex gap-2">
        <input id="dt-pin" className="input" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <button className="btn-primary" disabled={busy || pin.length !== 6}>{busy ? "Checking…" : "Check"}</button>
      </div>
      <div aria-live="polite" className="text-sm">
        {r?.status === "ok" ? (
          <div className="space-y-1">
            <p className="text-lg font-semibold">Estimated delivery: {r.range}</p>
            <p className="text-muted">Dispatch around {r.dispatchDate}. {r.feePaise === 0 ? "Free delivery." : `Delivery charge ${inr(r.feePaise)}${r.freeAbovePaise ? `; free above ${inr(r.freeAbovePaise)}` : ""}.`}</p>
            {r.note ? <p className="text-muted">{r.note}</p> : null}
          </div>
        ) : r ? <p className="text-muted">{r.message}</p> : null}
      </div>
      <p className="text-xs text-muted">This is an estimate from our dispatch policy (cut-off time, working days, zone). It is not live courier data and can change with stock or carrier delays.</p>
    </form>
  );
}
