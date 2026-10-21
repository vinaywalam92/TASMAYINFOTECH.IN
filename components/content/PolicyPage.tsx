import Link from "next/link";
import { getSettings, type PolicyKey } from "@/lib/settings";
import { safe } from "@/lib/safe";
import { Prose } from "./Prose";
import { Breadcrumbs } from "@/components/ui/Bits";

export async function PolicyPage({ policyKey, title }: { policyKey: PolicyKey; title: string }) {
  const s = await safe(() => getSettings(), null, "settings");
  const text = s?.policies[policyKey]?.trim();
  return (
    <div className="container-x max-w-3xl py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">{title}</h1>
      {text ? <Prose text={text} /> : (
        <p role="status" className="glass rounded-2xl p-5 text-sm text-muted">This policy has not been published yet. Please <Link href="/contact" className="underline">contact us</Link> if you have questions.</p>
      )}
      {policyKey === "returns" && s?.returnWindowDays ? <p className="mt-6 text-sm">Return window: <strong>{s.returnWindowDays} days</strong>.</p> : null}
    </div>
  );
}
