import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { safe } from "@/lib/safe";
import { Prose } from "@/components/content/Prose";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "About us" };

export default async function AboutPage() {
  const s = await safe(() => getSettings(), null, "settings");
  return (
    <div className="container-x max-w-3xl py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About us" }]} />
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">About {s?.businessName ?? "TASMAY INFOTECH"}</h1>
      {s?.aboutBody ? <Prose text={s.aboutBody} /> : <p className="text-muted">TASMAY INFOTECH is an Indian online store for IT hardware, accessories and electronics. The owner has not published the full company story yet; it can be added in Admin → Settings.</p>}
    </div>
  );
}
