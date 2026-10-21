"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "./CartProvider";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  name: string;
  inStock: boolean;
  quantity?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  openDrawer?: boolean;
};

/** Add-to-cart with visible feedback (spinner → check) and an accessible status message. */
export function AddToCartButton({ productId, name, inStock, quantity = 1, className, size = "md", openDrawer = false }: Props) {
  const { add } = useCart();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function onClick() {
    if (state === "busy") return;
    setState("busy");
    const ok = await add(productId, quantity, { name, openDrawer });
    setState(ok ? "done" : "idle");
    if (ok) setTimeout(() => setState("idle"), 1600);
  }

  const sizeCls = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!inStock || state === "busy"}
      className={cn("btn-primary", sizeCls, className)}
      aria-label={inStock ? `Add ${name} to cart` : `${name} is out of stock`}
    >
      {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : state === "done" ? <Check className="size-4" aria-hidden="true" /> : <ShoppingCart className="size-4" aria-hidden="true" />}
      <span>{!inStock ? "Out of stock" : state === "done" ? "Added" : "Add to cart"}</span>
    </button>
  );
}

export function BuyNowButton({ productId, name, inStock, quantity = 1, className }: Omit<Props, "size" | "openDrawer">) {
  const { add } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    const ok = await add(productId, quantity, { name });
    setBusy(false);
    if (ok) router.push("/checkout");
  }
  return (
    <button type="button" onClick={onClick} disabled={!inStock || busy} className={cn("btn-ghost btn-lg", className)} aria-label={`Buy ${name} now`}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Zap className="size-4" aria-hidden="true" />}
      Buy now
    </button>
  );
}
