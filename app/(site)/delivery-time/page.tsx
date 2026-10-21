import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { safe } from "@/lib/safe";
import { DeliveryChecker } from "@/components/tracking/DeliveryChecker";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Delivery time" };

export default async function DeliveryTimePage() {
  const s = await safe(() => getSettings(), null, "settings");
  return (
    <div className="container-x max-w-2xl py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Delivery time" }]} />
      <h1 className="mb-2 text-3xl font-bold">Delivery time</h1>
      <p className="mb-6 text-muted">Enter your PIN code to see the estimated delivery window.</p>
      {s?.deliveryNotice ? <p role="status" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">{s.deliveryNotice}</p> : null}
      <DeliveryChecker />
    </div>
  );
}
