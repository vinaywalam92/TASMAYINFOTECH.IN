"use client";

import { useActionState } from "react";
import Link from "next/link";
import { subscribeNewsletterAction } from "@/actions/engage";
import { Field, Check, FormMessage } from "@/components/forms/Field";
import { HumanFields } from "@/components/forms/HumanFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { ActionState } from "@/lib/validators";

export function NewsletterForm() {
  const [state, action] = useActionState<ActionState, FormData>(subscribeNewsletterAction, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3" noValidate>
      <HumanFields />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field label="Email address" name="email" type="email" required autoComplete="email" error={state.errors?.email} className="flex-1" />
        <div className="sm:mt-6"><SubmitButton pendingText="Subscribing…">Subscribe</SubmitButton></div>
      </div>
      <Check name="consent" required error={state.errors?.consent}>
        I agree to receive product and offer emails from TASMAY INFOTECH and have read the <Link href="/privacy-policy" className="underline">Privacy Policy</Link>. I can unsubscribe at any time.
      </Check>
      <FormMessage state={state} />
    </form>
  );
}
