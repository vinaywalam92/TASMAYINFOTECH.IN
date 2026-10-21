import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPaymentConfigured } from "@/lib/integrations/payments";
import { safe } from "@/lib/safe";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await safe(() => getCurrentUser(), null, "user");
  const saved = user
    ? await safe(() => db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }), [], "addresses")
    : [];
  return (
    <div className="theme-light bg-surface text-fg">
      <div className="container-x py-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <h1 className="mb-8 text-3xl font-bold">Checkout</h1>
        <CheckoutForm
          saved={saved.map((a) => ({ id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode }))}
          defaults={{ email: user?.email ?? "", phone: user?.phone ?? "", name: user?.name ?? "", signedIn: !!user }}
          payReady={isPaymentConfigured()}
          termsHref="/terms-and-conditions"
        />
      </div>
    </div>
  );
}
