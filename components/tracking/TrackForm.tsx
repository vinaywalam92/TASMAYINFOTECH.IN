"use client";

import { useActionState } from "react";
import { trackOrderAction, type TrackState } from "@/actions/track";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TrackingTimeline } from "./TrackingTimeline";

export function TrackForm({ defaultOrder }: { defaultOrder: string }) {
  const [s, action] = useActionState<TrackState, FormData>(trackOrderAction, {});
  return (
    <div className="space-y-6">
      <form action={action} className="glass space-y-4 rounded-2xl p-6" noValidate>
        <Field label="Order number" name="order" required defaultValue={s.values?.order ?? defaultOrder} />
        <Field label="Email or mobile used for the order" name="contact" required defaultValue={s.values?.contact} />
        <FormMessage state={{ ok: false, message: s.message }} />
        <SubmitButton pendingText="Looking up…">Track order</SubmitButton>
      </form>
      {s.view ? <TrackingTimeline view={s.view} /> : null}
    </div>
  );
}
