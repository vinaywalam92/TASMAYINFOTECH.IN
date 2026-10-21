import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/CartPageView";
import { Breadcrumbs } from "@/components/ui/Bits";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mb-8 text-3xl font-bold">Your cart</h1>
      <CartPageView />
    </div>
  );
}
