import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { safe } from "@/lib/safe";
import { ContactForm } from "@/components/forms/EnquiryForms";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [s, sp] = await Promise.all([safe(() => getSettings(), null, "settings"), searchParams]);
  const rows = [
    s?.email && { Icon: Mail, text: s.email, href: `mailto:${s.email}` },
    s?.phone && { Icon: Phone, text: s.phone, href: `tel:${s.phone.replace(/\s/g, "")}` },
    s?.address && { Icon: MapPin, text: s.address },
    s?.hours && { Icon: Clock, text: s.hours },
  ].filter(Boolean) as { Icon: typeof Mail; text: string; href?: string }[];
  const map = s?.mapEmbedUrl?.startsWith("https://www.google.com/maps/embed") ? s.mapEmbedUrl : "";
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact us" }]} />
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">Contact us</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-2xl p-6"><ContactForm productRef={sp.ref?.slice(0, 200) ?? ""} /></div>
        <aside className="space-y-4">
          {rows.length ? (
            <ul className="glass space-y-3 rounded-2xl p-5 text-sm">
              {rows.map(({ Icon, text, href }) => <li key={text} className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />{href ? <a href={href} className="hover:underline">{text}</a> : <span>{text}</span>}</li>)}
            </ul>
          ) : <p className="glass rounded-2xl p-5 text-sm text-muted">Use the form and our team will reply by email. Direct contact details will be published here by the store owner.</p>}
          {map ? <iframe title="Map" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="aspect-video w-full rounded-2xl border-0" /> : null}
        </aside>
      </div>
    </div>
  );
}
