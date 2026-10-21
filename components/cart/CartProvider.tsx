"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import type { CartView } from "@/lib/cart";
import {
  addToCartAction,
  applyCouponAction,
  removeCartItemAction,
  removeCouponAction,
  setCartQuantityAction,
  setDeliveryPinAction,
  type CartActionResult,
} from "@/actions/cart";

const EMPTY: CartView = {
  lines: [], count: 0, subtotalPaise: 0, discountPaise: 0, shippingPaise: 0, shippingStatus: "empty", shippingLabel: null,
  estimateText: null, freeShippingRemainingPaise: null, taxPaise: 0, totalPaise: 0, gstInclusive: true, couponCode: null,
  couponError: null, pincode: null, issues: [],
};

type Toast = { id: number; text: string; tone: "ok" | "error" };

type CartCtx = {
  cart: CartView;
  loaded: boolean;
  busy: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (productId: string, qty?: number, opts?: { name?: string; openDrawer?: boolean }) => Promise<boolean>;
  setQty: (productId: string, qty: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<string | null>;
  removeCoupon: () => Promise<void>;
  setPin: (pin: string) => Promise<string | null>;
  toast: (text: string, tone?: "ok" | "error") => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartView>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // Initial load of the server-side cart (guest cookie or signed-in user).
  useEffect(() => {
    let alive = true;
    fetch("/api/cart", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<CartView>) : EMPTY))
      .then((c) => alive && setCart(c))
      .catch(() => undefined)
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(async (fn: () => Promise<CartActionResult>): Promise<CartActionResult | null> => {
    setBusy(true);
    try {
      const r = await fn();
      setCart(r.cart);
      return r;
    } catch {
      toast("Something went wrong. Please try again.", "error");
      return null;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const value = useMemo<CartCtx>(
    () => ({
      cart,
      loaded,
      busy,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      toast,
      async add(productId, qty = 1, opts) {
        const r = await run(() => addToCartAction(productId, qty));
        if (!r) return false;
        if (r.error) {
          toast(r.error, "error");
          return false;
        }
        toast(opts?.name ? `${opts.name} added to your cart` : "Added to your cart");
        if (opts?.openDrawer) setDrawerOpen(true);
        return true;
      },
      async setQty(productId, qty) {
        const r = await run(() => setCartQuantityAction(productId, qty));
        if (r?.error) toast(r.error, "error");
      },
      async remove(productId) {
        await run(() => removeCartItemAction(productId));
      },
      async applyCoupon(code) {
        const r = await run(() => applyCouponAction(code));
        return r?.error ?? null;
      },
      async removeCoupon() {
        await run(() => removeCouponAction());
      },
      async setPin(pin) {
        const r = await run(() => setDeliveryPinAction(pin));
        return r?.error ?? null;
      },
    }),
    [cart, loaded, busy, drawerOpen, run, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-glass"
              role={t.tone === "error" ? "alert" : "status"}
            >
              {t.tone === "ok" ? <CheckCircle2 className="size-5 shrink-0 text-emerald-400" aria-hidden="true" /> : <AlertCircle className="size-5 shrink-0 text-red-400" aria-hidden="true" />}
              <span>{t.text}</span>
              <button type="button" aria-label="Dismiss notification" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-1 text-muted hover:text-fg">
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
