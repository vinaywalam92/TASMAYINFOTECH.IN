import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube, Mail, MapPin, Phone, Clock, Twitter } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getSettings } from "@/lib/settings";

const shop = [
  { href: "/store", label: "Store" },
  { href: "/categories", label: "All Categories" },
  { href: "/brands", label: "All Brands" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/cart", label: "Cart" },
];
const support = [
  { href: "/track-order", label: "Track Order" },
  { href: "/delivery-time", label: "Delivery Time" },
  { href: "/account/orders", label: "Order History" },
  { href: "/contact", label: "Contact Us" },
  { href: "/faqs", label: "FAQs" },
];
const business = [
  { href: "/business-solutions", label: "Business Solutions" },
  { href: "/bulk-enquiry", label: "Bulk Enquiry" },
  { href: "/request-quote", label: "Request a Quote" },
  { href: "/about", label: "About Us" },
];
const policies = [
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/return-refund-policy", label: "Return & Refund Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
];

function Col({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-4 text-sm font-semibold tracking-wide">{title}</h2>
      <ul className="space-y-2.5 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition hover:text-fg">{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Company details shown here come only from Admin → Settings. Empty values are simply not rendered. */
export async function Footer() {
  const s = await getSettings();
  const social = [
    { href: s.social.facebook, label: "Facebook", Icon: Facebook },
    { href: s.social.instagram, label: "Instagram", Icon: Instagram },
    { href: s.social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: s.social.x, label: "X (Twitter)", Icon: Twitter },
    { href: s.social.youtube, label: "YouTube", Icon: Youtube },
  ].filter((x) => x.href);

  return (
    <footer className="relative mt-24 border-t border-line/10 bg-card/40">
      <div className="container-x py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" aria-label="TASMAY INFOTECH home"><Logo animated={false} /></Link>
            <p className="mt-4 max-w-xs text-sm text-muted">
              IT hardware, computer accessories, electronics and technology products for homes, offices and institutions across India.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-muted">
              {s.address ? <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="whitespace-pre-line">{s.address}</span></li> : null}
              {s.phone ? <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-fg">{s.phone}</a></li> : null}
              {s.email ? <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><a href={`mailto:${s.email}`} className="hover:text-fg">{s.email}</a></li> : null}
              {s.hours ? <li className="flex gap-2.5"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="whitespace-pre-line">{s.hours}</span></li> : null}
              {s.gstin ? <li className="text-xs">GSTIN: {s.gstin}</li> : null}
            </ul>
            {social.length ? (
              <ul className="mt-5 flex gap-2">
                {social.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex size-9 items-center justify-center rounded-lg border border-line/15 text-muted transition hover:border-electric hover:text-fg">
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Col title="Shop" links={shop} />
          <Col title="Support" links={support} />
          <Col title="Business" links={business} />
          <Col title="Policies" links={policies} />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line/10 pt-6 text-xs text-muted sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} TASMAY INFOTECH. All rights reserved.</p>
          <p>Product images and brand names belong to their respective owners.</p>
        </div>
      </div>
    </footer>
  );
}
