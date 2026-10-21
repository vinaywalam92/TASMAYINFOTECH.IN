import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ClipboardList, FileText, Landmark, PackageSearch, Repeat } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Business solutions" };

const OFFERINGS = [
  { Icon: Building2, t: "Office set-ups", d: "Computers, peripherals, networking and printing for new or growing offices." },
  { Icon: Landmark, t: "Institutions", d: "Requirement-based supply for schools, colleges and organisations." },
  { Icon: Repeat, t: "Recurring supplies", d: "Toner, cartridges and consumables ordered on your schedule." },
  { Icon: PackageSearch, t: "Product sourcing", d: "Can't find an item? Tell us the specification and we'll look into it." },
  { Icon: FileText, t: "GST invoices", d: "Business buyers can add a GSTIN at checkout or on a quote request." },
  { Icon: ClipboardList, t: "Written quotations", d: "Share a list; our team replies with a quotation for your review." },
];

export default function BusinessSolutions() {
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Business solutions" }]} />
      <h1 className="text-3xl font-bold md:text-4xl">Business solutions</h1>
      <p className="mt-2 max-w-2xl text-muted">Practical procurement help for businesses and institutions. Availability and pricing are confirmed in writing in your quotation.</p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {OFFERINGS.map(({ Icon, t, d }) => (
          <li key={t} className="glass rounded-2xl p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-electric-500/15 text-electric-400"><Icon className="size-5" aria-hidden="true" /></span>
            <h2 className="mt-4 font-semibold">{t}</h2><p className="mt-1.5 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/request-quote" className="btn-primary btn-lg">Request a quote</Link>
        <Link href="/bulk-enquiry" className="btn-ghost btn-lg">Bulk enquiry</Link>
        <Link href="/contact" className="btn-ghost btn-lg">Talk to us</Link>
      </div>
    </div>
  );
}
