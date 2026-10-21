import type { Metadata } from "next";
import { QuoteForm } from "@/components/forms/EnquiryForms";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Bulk enquiry" };

export default function Page() {
  return (
    <div className="container-x max-w-3xl py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Bulk enquiry" }]} />
      <h1 className="mb-2 text-3xl font-bold md:text-4xl">Bulk enquiry</h1>
      <p className="mb-6 text-muted">Buying in volume for an office, school or business? Tell us what you need. We do not promise pricing or availability until a quotation is sent.</p>
      <div className="glass rounded-2xl p-6"><QuoteForm kind="BULK" /></div>
    </div>
  );
}
