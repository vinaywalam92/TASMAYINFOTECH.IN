"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/auth";
import { saveAddressAction, updateProfileAction } from "@/actions/account";
import { Field, FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { INDIAN_STATES, type ActionState } from "@/lib/validators";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [s, action] = useActionState<ActionState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Full name" name="name" required defaultValue={s.values?.name ?? name} error={s.errors?.name} />
      <Field label="Mobile" name="phone" type="tel" defaultValue={s.values?.phone ?? phone} error={s.errors?.phone} />
      <FormMessage state={s} />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [s, action] = useActionState<ActionState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Current password" name="current" type="password" required autoComplete="current-password" error={s.errors?.current} />
      <Field label="New password" name="password" type="password" required autoComplete="new-password" hint="At least 10 characters." error={s.errors?.password} />
      <FormMessage state={s} />
      <SubmitButton pendingText="Updating…">Change password</SubmitButton>
    </form>
  );
}

type Addr = { id?: string; label?: string | null; name?: string; phone?: string; line1?: string; line2?: string | null; city?: string; state?: string; pincode?: string; isDefault?: boolean };

export function AddressForm({ address }: { address?: Addr }) {
  const [s, action] = useActionState<ActionState, FormData>(saveAddressAction, {});
  const v = (k: keyof Addr) => (s.values?.[k as string] ?? (address?.[k] as string | null | undefined) ?? "") as string;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      {address?.id ? <input type="hidden" name="id" value={address.id} /> : null}
      <Field label="Label" name="label" defaultValue={v("label")} placeholder="Home, Office…" className="sm:col-span-2" />
      <Field label="Full name" name="name" required defaultValue={v("name")} error={s.errors?.name} />
      <Field label="Mobile" name="phone" type="tel" required defaultValue={v("phone")} error={s.errors?.phone} />
      <Field label="Address line 1" name="line1" required defaultValue={v("line1")} error={s.errors?.line1} className="sm:col-span-2" />
      <Field label="Address line 2" name="line2" defaultValue={v("line2")} className="sm:col-span-2" />
      <Field label="City" name="city" required defaultValue={v("city")} error={s.errors?.city} />
      <Field label="State" name="state" as="select" required defaultValue={v("state")} error={s.errors?.state}>
        <option value="">Select state</option>
        {INDIAN_STATES.map((st) => <option key={st}>{st}</option>)}
      </Field>
      <Field label="PIN code" name="pincode" required inputMode="numeric" maxLength={6} defaultValue={v("pincode")} error={s.errors?.pincode} />
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-4 accent-electric-500" /> Make default</label>
      <div className="sm:col-span-2"><FormMessage state={s} /></div>
      <div className="sm:col-span-2"><SubmitButton pendingText="Saving…">Save address</SubmitButton></div>
    </form>
  );
}
