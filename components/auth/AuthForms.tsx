"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/actions/auth";
import { Field, FormMessage } from "@/components/forms/Field";
import { HumanFields } from "@/components/forms/HumanFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { ActionState } from "@/lib/validators";

export function LoginForm({ next }: { next: string }) {
  const [s, action] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={s.values?.email} error={s.errors?.email} />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" error={s.errors?.password} />
      <FormMessage state={s} />
      <SubmitButton className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-electric-400 hover:underline">Forgot password?</Link>
        <Link href={`/register${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-electric-400 hover:underline">Create account</Link>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [s, action] = useActionState<ActionState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <HumanFields />
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" name="name" required autoComplete="name" defaultValue={s.values?.name} error={s.errors?.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={s.values?.email} error={s.errors?.email} />
      <Field label="Mobile" name="phone" type="tel" autoComplete="tel" defaultValue={s.values?.phone} error={s.errors?.phone} />
      <Field label="Password" name="password" type="password" required autoComplete="new-password" hint="At least 10 characters." error={s.errors?.password} />
      <FormMessage state={s} />
      <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">Already registered? <Link href="/login" className="text-electric-400 hover:underline">Sign in</Link></p>
      <p className="text-center text-xs text-muted">By creating an account you agree to our <Link href="/terms-and-conditions" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
    </form>
  );
}

export function ForgotForm() {
  const [s, action] = useActionState<ActionState, FormData>(forgotPasswordAction, {});
  if (s.ok) return <FormMessage state={s} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" required autoComplete="email" error={s.errors?.email} />
      <FormMessage state={s} />
      <SubmitButton className="w-full" pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action] = useActionState<ActionState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" required autoComplete="new-password" hint="At least 10 characters." error={s.errors?.password} />
      <Field label="Confirm new password" name="confirm" type="password" required autoComplete="new-password" error={s.errors?.confirm} />
      <FormMessage state={s} />
      <SubmitButton className="w-full" pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-16">
      <div className="glass glow-border w-full max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p> : <div className="mb-6" />}
        {children}
      </div>
    </div>
  );
}
