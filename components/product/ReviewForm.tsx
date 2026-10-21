"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/actions/engage";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { ActionState } from "@/lib/validators";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitReviewAction, {});
  const [rating, setRating] = useState(0);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onClick={() => setRating(n)}>
              <Star className={cn("size-7", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
            </button>
          ))}
        </div>
        {state.errors?.rating ? <p role="alert" className="field-error">{state.errors.rating}</p> : null}
      </fieldset>
      <Field label="Title" name="title" maxLength={120} />
      <Field label="Review" name="body" as="textarea" required error={state.errors?.body} />
      <FormMessage state={state} />
      <SubmitButton pendingText="Submitting…">Submit review</SubmitButton>
      <p className="hint">Only customers who bought this product can review it. Reviews are moderated before publishing.</p>
    </form>
  );
}
