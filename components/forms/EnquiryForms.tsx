"use client";

import { useActionState } from "react";
import Link from "next/link";
import { contactAction, quoteAction } from "@/actions/engage";
import { Check, Field, FormMessage } from "@/components/forms/Field";
import { HumanFields } from "@/components/forms/HumanFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { ActionState } from "@/lib/validators";

const Consent = ({ error }: { error?: string }) => (
  <Check name="consent" required error={error}>I agree that TASMAY INFOTECH may use these details to respond to my request, as described in the <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</Check>
);

export const CONTACT_TYPES = ["General question", "Product enquiry", "Order support", "Business / bulk", "Other"];

export function ContactForm({ productRef = "" }: { productRef?: string }) {
  const [s, action] = useActionState<ActionState, FormData>(contactAction, {});
  if (s.ok) return <FormMessage state={s} />;
  const v = (k: string) => s.values?.[k];
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <HumanFields />
      <Field label="Name" name="name" required defaultValue={v("name")} error={s.errors?.name} />
      <Field label="Company" name="company" defaultValue={v("company")} />
      <Field label="Email" name="email" type="email" required defaultValue={v("email")} error={s.errors?.email} />
      <Field label="Mobile" name="phone" type="tel" required defaultValue={v("phone")} error={s.errors?.phone} />
      <Field label="Enquiry type" name="enquiryType" as="select" required defaultValue={v("enquiryType")} error={s.errors?.enquiryType} className="sm:col-span-2">
        <option value="">Select…</option>
        {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
      </Field>
      <Field label="Product or order reference" name="productRef" defaultValue={v("productRef") ?? productRef} className="sm:col-span-2" />
      <Field label="Message" name="message" as="textarea" required defaultValue={v("message")} error={s.errors?.message} className="sm:col-span-2" />
      <div className="sm:col-span-2"><Consent error={s.errors?.consent} /></div>
      <div className="sm:col-span-2"><FormMessage state={s} /></div>
      <div className="sm:col-span-2"><SubmitButton pendingText="Sending…">Send message</SubmitButton></div>
    </form>
  );
}

export function QuoteForm({ kind }: { kind: "BULK" | "QUOTE" | "SOURCING" | "TENDER" | "REQUIREMENTS" }) {
  const [s, action] = useActionState<ActionState, FormData>(quoteAction, {});
  if (s.ok) return <FormMessage state={s} />;
  const v = (k: string) => s.values?.[k];
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <HumanFields />
      <input type="hidden" name="kind" value={kind} />
      <Field label="Your name" name="name" required defaultValue={v("name")} error={s.errors?.name} />
      <Field label="Company / organisation" name="company" defaultValue={v("company")} />
      <Field label="Email" name="email" type="email" required defaultValue={v("email")} error={s.errors?.email} />
      <Field label="Mobile" name="phone" type="tel" required defaultValue={v("phone")} error={s.errors?.phone} />
      <Field label="GSTIN" name="gstin" defaultValue={v("gstin")} error={s.errors?.gstin} maxLength={15} />
      <Field label="Delivery city" name="deliveryCity" defaultValue={v("deliveryCity")} />
      <Field label="Products / specifications needed" name="items" as="textarea" required defaultValue={v("items")} error={s.errors?.items} hint="List items, models or specs, one per line." className="sm:col-span-2" />
      <Field label="Quantity" name="quantity" defaultValue={v("quantity")} />
      <Field label="Budget (optional)" name="budget" defaultValue={v("budget")} />
      <Field label="Needed by" name="timeline" defaultValue={v("timeline")} />
      <Field label="Additional notes" name="notes" as="textarea" defaultValue={v("notes")} className="sm:col-span-2" />
      <div className="sm:col-span-2"><Consent error={s.errors?.consent} /></div>
      <div className="sm:col-span-2"><FormMessage state={s} /></div>
      <div className="sm:col-span-2"><SubmitButton pendingText="Submitting…">Submit request</SubmitButton></div>
    </form>
  );
}
