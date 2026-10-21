"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Heart, Menu, Search, ShoppingCart, Truck, User, X, Building2, ReceiptText } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SearchBox } from "./SearchBox";
import { ProductArt } from "@/components/ui/ProductArt";
import { useCart } from "@/components/cart/CartProvider";
import { useDialog } from "@/hooks/useDialog";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type HeaderCategory = { slug: string; name: string; iconKey: string | null; children: { slug: string; name: string }[] };

export function Header({ categories, userName }: { categories: HeaderCategory[]; userName: string | null }) {
  const pathname = usePathname();
  const { cart, openDrawer } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const megaWrap = useRef<HTMLDivElement>(null);
  const closeMobile = useCallback(() => setMobile(false), []);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Close menus on navigation.
  useEffect(() => {
    setMega(false);
    setMobile(false);
    setMobileSearch(false);
  }, [pathname]);

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMega(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mega]);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMegaSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(false), 140);
  };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={cn("sticky top-0 z-50 transition-all duration-300", scrolled ? "border-b border-line/10 bg-surface/80 shadow-glass backdrop-blur-xl" : "bg-transparent")}>
      {/* Utility bar: quick access to key shopping pages */}
      <div className={cn("hidden overflow-hidden border-b border-line/5 text-xs text-muted transition-all duration-300 md:block", scrolled ? "max-h-0 border-transparent opacity-0" : "max-h-10 opacity-100")}>
        <div className="container-x flex h-9 items-center justify-between">
          <p>Technology for work, business and everyday life.</p>
          <nav aria-label="Quick links" className="flex items-center gap-5">
            <Link href="/delivery-time" className="inline-flex items-center gap-1.5 hover:text-fg"><Truck className="size-3.5" aria-hidden="true" />Delivery Time</Link>
            <Link href="/account/orders" className="inline-flex items-center gap-1.5 hover:text-fg"><ReceiptText className="size-3.5" aria-hidden="true" />Order History</Link>
            <Link href="/wishlist" className="inline-flex items-center gap-1.5 hover:text-fg"><Heart className="size-3.5" aria-hidden="true" />Wishlist</Link>
            <Link href="/bulk-enquiry" className="inline-flex items-center gap-1.5 hover:text-fg"><Building2 className="size-3.5" aria-hidden="true" />Bulk Enquiry</Link>
          </nav>
        </div>
      </div>

      <div className="container-x">
        <div className={cn("flex items-center gap-3 transition-all duration-300 md:gap-6", scrolled ? "h-16" : "h-[72px]")}>
          <Link href="/" aria-label="TASMAY INFOTECH home" className="shrink-0">
            <Logo size={scrolled ? 32 : 38} />
          </Link>

          <SearchBox className="ml-auto hidden max-w-xl flex-1 md:block lg:ml-6" />

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button type="button" onClick={() => setMobileSearch((v) => !v)} aria-label="Search" aria-expanded={mobileSearch} className="rounded-xl p-2.5 hover:bg-line/10 md:hidden">
              <Search className="size-5" />
            </button>
            <Link href="/account" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-line/10 md:inline-flex" aria-label={userName ? `Account for ${userName}` : "Sign in or create an account"}>
              <User className="size-5" aria-hidden="true" />
              <span className="max-w-24 truncate">{userName ? userName.split(" ")[0] : "Account"}</span>
            </Link>
            <Link
              href="/cart"
              onClick={(e) => {
                // Progressive enhancement: JS opens the drawer, no-JS still reaches /cart.
                e.preventDefault();
                openDrawer();
              }}
              className="relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-line/10"
              aria-label={`Cart, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
            >
              <ShoppingCart className="size-5" aria-hidden="true" />
              <span className="hidden md:inline">Cart</span>
              <AnimatePresence mode="popLayout">
                {cart.count > 0 ? (
                  <motion.span
                    key={cart.count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-electric to-violet px-1.5 text-[11px] font-bold leading-5 text-white md:static md:ml-0.5"
                    aria-hidden="true"
                  >
                    {cart.count}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>
            <button type="button" onClick={() => setMobile(true)} aria-label="Open menu" aria-expanded={mobile} className="rounded-xl p-2.5 hover:bg-line/10 lg:hidden">
              <Menu className="size-6" />
            </button>
          </div>
        </div>

        {mobileSearch ? (
          <div className="pb-3 md:hidden">
            <SearchBox autoFocus onNavigate={() => setMobileSearch(false)} />
          </div>
        ) : null}

        {/* Primary navigation (desktop) */}
        <nav aria-label="Primary" className="relative hidden h-11 items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) =>
            "mega" in l && l.mega ? (
              <div
                key={l.href}
                ref={megaWrap}
                className="relative"
                onMouseEnter={openMega}
                onMouseLeave={closeMegaSoon}
                onBlur={(e) => {
                  if (!megaWrap.current?.contains(e.relatedTarget as Node)) setMega(false);
                }}
              >
                <button type="button" aria-expanded={mega} aria-haspopup="true" aria-controls="mega-menu" onClick={() => setMega((v) => !v)} className={cn("navlink inline-flex items-center gap-1", active(l.href) && "text-fg")}>
                  {l.label}
                  <ChevronDown className={cn("size-4 transition-transform", mega && "rotate-180")} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {mega ? (
                    <motion.div
                      id="mega-menu"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18 }}
                      className="glass absolute left-0 top-full z-50 mt-1 w-[min(980px,90vw)] rounded-2xl p-6"
                    >
                      {categories.length === 0 ? (
                        <p className="text-sm text-muted">Categories will appear here once the catalogue is set up.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 xl:grid-cols-4">
                          {categories.map((c) => (
                            <div key={c.slug}>
                              <Link href={`/categories/${c.slug}`} className="group flex items-center gap-3">
                                <span className="size-11 rounded-xl bg-electric/10 p-1.5 transition group-hover:bg-electric/20"><ProductArt kind={c.iconKey} /></span>
                                <span className="text-sm font-semibold group-hover:text-electric-400">{c.name}</span>
                              </Link>
                              <ul className="mt-2.5 space-y-1.5 pl-14">
                                {c.children.slice(0, 5).map((ch) => (
                                  <li key={ch.slug}>
                                    <Link href={`/categories/${ch.slug}`} className="text-sm text-muted hover:text-fg">{ch.name}</Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-6 flex items-center justify-between border-t border-line/10 pt-4 text-sm">
                        <Link href="/categories" className="font-medium text-electric-400 hover:underline">All categories →</Link>
                        <Link href="/brands" className="text-muted hover:text-fg">Browse brands</Link>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined} className={cn("navlink", active(l.href) && "text-fg")}>
                {l.label}
              </Link>
            ),
          )}
        </nav>
      </div>

      <MobileNav open={mobile} onClose={closeMobile} categories={categories} userName={userName} />
    </header>
  );
}

function MobileNav({ open, onClose, categories, userName }: { open: boolean; onClose: () => void; categories: HeaderCategory[]; userName: string | null }) {
  const panel = useRef<HTMLDivElement>(null);
  useDialog(open, onClose, panel);
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-card shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
          >
            <div className="flex items-center justify-between border-b border-line/10 px-5 py-4">
              <Logo size={32} animated={false} />
              <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-2 hover:bg-line/10"><X className="size-5" /></button>
            </div>
            <nav aria-label="Mobile" className="flex-1 px-3 py-4">
              <ul className="space-y-1">
                {NAV_LINKS.map((l) =>
                  "mega" in l && l.mega ? (
                    <li key={l.href}>
                      <details className="group rounded-xl">
                        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 text-base font-medium hover:bg-line/10">
                          {l.label}
                          <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <ul className="mb-2 ml-3 border-l border-line/10 pl-3">
                          {categories.map((c) => (
                            <li key={c.slug}>
                              <Link href={`/categories/${c.slug}`} onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-muted hover:text-fg">{c.name}</Link>
                            </li>
                          ))}
                          <li><Link href="/categories" onClick={onClose} className="block px-3 py-2 text-sm text-electric-400">All categories →</Link></li>
                        </ul>
                      </details>
                    </li>
                  ) : (
                    <li key={l.href}><Link href={l.href} onClick={onClose} className="block rounded-xl px-3 py-3 text-base font-medium hover:bg-line/10">{l.label}</Link></li>
                  ),
                )}
              </ul>
              <hr className="my-4 border-line/10" />
              <ul className="space-y-1 text-sm">
                <li><Link href="/account" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-line/10"><User className="size-4" aria-hidden="true" />{userName ? `Account (${userName.split(" ")[0]})` : "Sign in / Account"}</Link></li>
                <li><Link href="/account/orders" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-line/10"><ReceiptText className="size-4" aria-hidden="true" />Order History</Link></li>
                <li><Link href="/delivery-time" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-line/10"><Truck className="size-4" aria-hidden="true" />Delivery Time</Link></li>
                <li><Link href="/wishlist" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-line/10"><Heart className="size-4" aria-hidden="true" />Wishlist</Link></li>
                <li><Link href="/bulk-enquiry" onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-line/10"><Building2 className="size-4" aria-hidden="true" />Bulk Enquiry</Link></li>
              </ul>
            </nav>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
