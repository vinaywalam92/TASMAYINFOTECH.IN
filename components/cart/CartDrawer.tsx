"use client";

import { useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { useDialog } from "@/hooks/useDialog";
import { ProductImage } from "@/components/ui/ProductImage";
import { inr } from "@/lib/format";

export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, setQty, remove, busy } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(drawerOpen, closeDrawer, panel);
  const itemsTotal = Math.max(0, cart.totalPaise - cart.shippingPaise);

  return (
    <AnimatePresence>
      {drawerOpen ? (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <motion.aside
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="glass-solid absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
          >
            <header className="flex items-center justify-between border-b border-line/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="size-5 text-electric-400" aria-hidden="true" /> Your cart
                <span className="chip">{cart.count}</span>
              </h2>
              <button type="button" onClick={closeDrawer} aria-label="Close cart" className="rounded-lg p-2 text-muted hover:bg-line/10 hover:text-fg">
                <X className="size-5" />
              </button>
            </header>

            {cart.lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-electric/10 text-electric-400">
                  <ShoppingBag className="size-8" aria-hidden="true" />
                </div>
                <p className="font-medium">Your cart is empty</p>
                <p className="text-sm text-muted">Browse the store and add something you like.</p>
                <Link href="/store" onClick={closeDrawer} className="btn-primary">
                  Explore store
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {cart.lines.map((l) => (
                    <li key={l.productId} className="flex gap-3">
                      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-line/5">
                        <ProductImage src={l.image} alt={l.name} iconKey={l.iconKey} className="p-1" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/product/${l.slug}`} onClick={closeDrawer} className="line-clamp-2 text-sm font-medium hover:text-electric-400">
                          {l.name}
                        </Link>
                        {l.brand ? <p className="text-xs text-muted">{l.brand}</p> : null}
                        {l.stock <= 0 ? <p className="mt-1 text-xs text-red-400">Out of stock</p> : null}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-line/15" role="group" aria-label={`Quantity for ${l.name}`}>
                            <button type="button" disabled={busy} onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Decrease quantity" className="p-2 hover:bg-line/10 disabled:opacity-50">
                              <Minus className="size-3.5" />
                            </button>
                            <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">{l.qty}</span>
                            <button type="button" disabled={busy || l.qty >= l.stock} onClick={() => setQty(l.productId, l.qty + 1)} aria-label="Increase quantity" className="p-2 hover:bg-line/10 disabled:opacity-50">
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{inr(l.lineTotalPaise)}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => remove(l.productId)} aria-label={`Remove ${l.name}`} className="self-start rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <footer className="space-y-3 border-t border-line/10 px-5 py-4">
                  {cart.issues.length ? <p role="alert" className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{cart.issues[0]}</p> : null}
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted">Items total (incl. GST)</span>
                    <span className="text-lg font-bold tabular-nums">{inr(itemsTotal)}</span>
                  </div>
                  <p className="text-xs text-muted">Delivery charges and the final total are shown at checkout.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/cart" onClick={closeDrawer} className="btn-ghost">View cart</Link>
                    <Link href="/checkout" onClick={closeDrawer} className="btn-primary">Checkout</Link>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
