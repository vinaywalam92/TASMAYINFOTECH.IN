"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { CartSummary } from "@/components/cart/CartSummary";
import { CouponBox } from "@/components/cart/CouponPinBox";
import { placeOrderAction } from "@/actions/checkout";
import { INDIAN_STATES } from "@/lib/validators";
import { inr } from "@/lib/format";
import { ProductImage } from "@/components/ui/ProductImage";
import { EmptyState } from "@/components/ui/Bits";

type Saved = { id: string; label: string | null; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
type Addr = { name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string };
const blank: Addr = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: { error?: { description?: string } }) => void): void } }
}

function AddressFields({ prefix, value, onChange, errors, onPin }: { prefix: string; value: Addr; onChange: (a: Addr) => void; errors: Record<string, string>; onPin?: (pin: string) => void }) {
  const set = (k: keyof Addr, v: string) => onChange({ ...value, [k]: v });
  const err = (k: string) => errors[`${prefix}.${k}`];
  const f = (k: keyof Addr, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, req = true) => (
    <div>
      <label htmlFor={`${prefix}-${k}`} className="label">{label}{req ? <span aria-hidden="true" className="ml-0.5 text-red-400">*</span> : null}</label>
      <input id={`${prefix}-${k}`} className="input" value={value[k]} required={req} aria-invalid={err(k) ? true : undefined} onChange={(e) => set(k, e.target.value)} {...extra} />
      {err(k) ? <p role="alert" className="field-error">{err(k)}</p> : null}
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {f("name", "Full name", { autoComplete: "name" })}
      {f("phone", "Mobile number", { autoComplete: "tel", inputMode: "tel", placeholder: "10-digit mobile" })}
      <div className="sm:col-span-2">{f("line1", "Address line 1", { autoComplete: "address-line1" })}</div>
      <div className="sm:col-span-2">{f("line2", "Address line 2", { autoComplete: "address-line2" }, false)}</div>
      {f("city", "City", { autoComplete: "address-level2" })}
      <div>
        <label htmlFor={`${prefix}-state`} className="label">State<span aria-hidden="true" className="ml-0.5 text-red-400">*</span></label>
        <select id={`${prefix}-state`} className="input" value={value.state} required onChange={(e) => set("state", e.target.value)}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {err("state") ? <p role="alert" className="field-error">{err("state")}</p> : null}
      </div>
      {f("pincode", "PIN code", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code", onChange: (e) => { const v = e.target.value.replace(/\D/g, ""); set("pincode", v); if (v.length === 6) onPin?.(v); } })}
    </div>
  );
}

export function CheckoutForm({ saved, defaults, payReady, termsHref }: { saved: Saved[]; defaults: { email: string; phone: string; name: string; signedIn: boolean }; payReady: boolean; termsHref: string }) {
  const router = useRouter();
  const { cart, loaded, setPin, toast } = useCart();
  const [email, setEmail] = useState(defaults.email);
  const [phone, setPhone] = useState(defaults.phone);
  const [ship, setShip] = useState<Addr>({ ...blank, name: defaults.name, phone: defaults.phone });
  const [bill, setBill] = useState<Addr>(blank);
  const [same, setSame] = useState(true);
  const [gstin, setGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sdk, setSdk] = useState(false);
  const pinTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { if (typeof window !== "undefined" && window.Razorpay) setSdk(true); }, []);
  useEffect(() => { if (loaded && cart.pincode && !ship.pincode) setShip((s) => ({ ...s, pincode: cart.pincode! })); }, [loaded, cart.pincode]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPin(pin: string) {
    clearTimeout(pinTimer.current);
    pinTimer.current = setTimeout(() => { void setPin(pin); }, 250);
  }
  function applySaved(id: string) {
    const a = saved.find((x) => x.id === id);
    if (!a) return;
    setShip({ name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode });
    onPin(a.pincode);
  }

  if (!loaded) return <div className="skeleton h-72 rounded-2xl" aria-busy="true" />;
  if (!cart.lines.length) return <EmptyState title="Your cart is empty" action={{ href: "/store", label: "Continue shopping" }} />;

  const blocked = cart.issues.length > 0 || cart.shippingStatus === "unserviceable" || cart.shippingStatus === "unconfigured";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErrors({});
    if (!payReady) return setMsg("Online payments are not available right now. Please contact us to place this order.");
    if (!sdk || !window.Razorpay) return setMsg("The payment window is still loading. Please try again in a moment.");
    setBusy(true);
    try {
      const res = await placeOrderAction({ email, phone, shipping: ship, billingSame: same, billing: same ? undefined : bill, gstin, notes, acceptTerms: terms as true });
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setMsg(res.message);
        setBusy(false);
        return;
      }
      const rz = new window.Razorpay!({
        key: res.keyId,
        amount: res.amountPaise,
        currency: "INR",
        name: "TASMAY INFOTECH",
        description: `Order ${res.orderNumber}`,
        order_id: res.gatewayOrderId,
        prefill: res.prefill,
        theme: { color: "#2f5bff" },
        modal: { ondismiss: () => { setBusy(false); setMsg("Payment was not completed. Your items are held briefly; you can try again."); } },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const v = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber: res.orderNumber, ...r }),
            });
            const d = await v.json().catch(() => ({}));
            if (v.ok && d.ok) return router.push(`/order/success?order=${encodeURIComponent(d.orderNumber)}&t=${encodeURIComponent(d.token)}`);
            if (d.pending) return router.push(`/order/success?order=${encodeURIComponent(res.orderNumber)}&t=${encodeURIComponent(res.accessToken)}`);
            setMsg(d.message ?? "We could not confirm the payment.");
          } catch {
            setMsg("We could not reach the server to confirm your payment. If money was deducted, your order will be confirmed automatically.");
          }
          setBusy(false);
        },
      });
      rz.on("payment.failed", (r) => { setMsg(r.error?.description ?? "The payment failed. You have not been charged."); setBusy(false); });
      rz.open();
    } catch {
      setMsg("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setSdk(true)} />
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_400px]" noValidate>
        <div className="space-y-8">
          {!defaults.signedIn ? <p className="rounded-xl border border-line/15 px-4 py-3 text-sm text-muted">Checking out as a guest. <Link href="/login?next=/checkout" className="text-electric-500 underline">Sign in</Link> to use saved addresses and track orders in your account.</p> : null}

          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-semibold">Contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="co-email" className="label">Email<span aria-hidden="true" className="ml-0.5 text-red-400">*</span></label>
                <input id="co-email" type="email" className="input" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.email ? true : undefined} />
                {errors.email ? <p role="alert" className="field-error">{errors.email}</p> : null}
              </div>
              <div>
                <label htmlFor="co-phone" className="label">Mobile<span aria-hidden="true" className="ml-0.5 text-red-400">*</span></label>
                <input id="co-phone" type="tel" className="input" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={errors.phone ? true : undefined} />
                {errors.phone ? <p role="alert" className="field-error">{errors.phone}</p> : null}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-semibold">Shipping address</legend>
            {saved.length ? (
              <div>
                <label htmlFor="co-saved" className="label">Use a saved address</label>
                <select id="co-saved" className="input" defaultValue="" onChange={(e) => applySaved(e.target.value)}>
                  <option value="">Select…</option>
                  {saved.map((a) => <option key={a.id} value={a.id}>{a.label ? `${a.label}: ` : ""}{a.line1}, {a.city} {a.pincode}</option>)}
                </select>
              </div>
            ) : null}
            <AddressFields prefix="shipping" value={ship} onChange={setShip} errors={errors} onPin={onPin} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-lg font-semibold">Billing &amp; GST</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-electric-500" checked={same} onChange={(e) => setSame(e.target.checked)} /> Billing address is the same as shipping</label>
            {!same ? <AddressFields prefix="billing" value={bill} onChange={setBill} errors={errors} /> : null}
            <div>
              <label htmlFor="co-gstin" className="label">GSTIN <span className="text-xs font-normal text-muted">(optional, for business invoices)</span></label>
              <input id="co-gstin" className="input uppercase" maxLength={15} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} aria-invalid={errors.gstin ? true : undefined} />
              {errors.gstin ? <p role="alert" className="field-error">{errors.gstin}</p> : null}
            </div>
            <div>
              <label htmlFor="co-notes" className="label">Order notes <span className="text-xs font-normal text-muted">(optional)</span></label>
              <textarea id="co-notes" rows={3} maxLength={500} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </fieldset>
        </div>

        <aside className="glass h-fit space-y-5 rounded-2xl p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="max-h-60 space-y-3 overflow-y-auto">
            {cart.lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3 text-sm">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-line/5"><ProductImage src={l.image} alt="" iconKey={l.iconKey} className="p-0.5" /></div>
                <span className="line-clamp-2 flex-1">{l.name} <span className="text-muted">× {l.qty}</span></span>
                <span className="tabular-nums">{inr(l.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <CouponBox />
          <CartSummary cart={cart} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-electric-500" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span>I agree to the <Link href={termsHref} className="underline" target="_blank">Terms &amp; Conditions</Link>, <Link href="/return-refund-policy" className="underline" target="_blank">Return &amp; Refund Policy</Link> and <Link href="/privacy-policy" className="underline" target="_blank">Privacy Policy</Link>.</span>
          </label>
          {errors.acceptTerms ? <p role="alert" className="field-error">{errors.acceptTerms}</p> : null}
          {msg ? <p role="alert" className="msg-err rounded-xl border px-4 py-3 text-sm">{msg}</p> : null}
          {!payReady ? <p className="msg-err rounded-xl border px-4 py-3 text-sm">Online payment is not enabled on this store yet. Please <Link href="/contact" className="underline">contact us</Link> to order.</p> : null}
          <button className="btn-primary btn-lg w-full" disabled={busy || blocked || !terms || !payReady}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
            {busy ? "Processing…" : `Pay ${inr(cart.totalPaise)}`}
          </button>
          <p className="text-center text-xs text-muted">Secure payment via Razorpay. We never see or store your card details.</p>
        </aside>
      </form>
    </>
  );
}
