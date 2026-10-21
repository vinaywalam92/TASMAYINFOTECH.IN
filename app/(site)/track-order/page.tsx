import type { Metadata } from "next";
import { trackBySignedLink } from "@/actions/track";
import { TrackForm } from "@/components/tracking/TrackForm";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Track order", robots: { index: false } };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string; t?: string }> }) {
  const { order = "", t = "" } = await searchParams;
  const view = order && t ? await trackBySignedLink(order, t) : null;
  return (
    <div className="container-x max-w-2xl py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Track order" }]} />
      <h1 className="mb-2 text-3xl font-bold">Track your order</h1>
      <p className="mb-6 text-muted">Status shown here is recorded by our team when an order is processed and shipped.</p>
      {view ? <TrackingTimeline view={view} /> : <TrackForm defaultOrder={order} />}
    </div>
  );
}
