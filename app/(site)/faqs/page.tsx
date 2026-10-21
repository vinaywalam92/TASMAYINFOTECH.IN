import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "FAQs" };

const FAQS = [
  { q: "How do I pay?", a: "Online payment is processed by Razorpay when enabled for the store. Card details never reach our servers." },
  { q: "How long will delivery take?", a: "It depends on your PIN code. Use the delivery checker for an estimate based on our dispatch policy.", href: "/delivery-time", l: "Check delivery time" },
  { q: "How can I track my order?", a: "Use your order number with the email or mobile on the order, or open the link in your confirmation.", href: "/track-order", l: "Track order" },
  { q: "Can I get a GST invoice?", a: "Add your GSTIN at checkout. Invoices are available from your order page once payment is confirmed." },
  { q: "Do you take bulk or business orders?", a: "Yes, send a requirement and we'll reply with a quotation.", href: "/request-quote", l: "Request a quote" },
  { q: "What if I want to return something?", a: "Please read our Return & Refund Policy.", href: "/return-refund-policy", l: "Return policy" },
  { q: "Can I cancel an order?", a: "Orders can be cancelled from your account before they are packed.", href: "/cancellation-policy", l: "Cancellation policy" },
];

export default function FaqPage() {
  return (
    <div className="container-x max-w-3xl py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQs" }]} />
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Frequently asked questions</h1>
      <div className="space-y-2">
        {FAQS.map((f) => (
          <details key={f.q} className="glass rounded-xl px-4 py-3">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 text-sm text-muted">{f.a} {f.href ? <Link href={f.href} className="text-electric-400 underline">{f.l}</Link> : null}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
