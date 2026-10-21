import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { AuthCard, LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/account");
  if (await getCurrentUser().catch(() => null)) redirect(next);
  return (
    <AuthCard title="Sign in" subtitle={sp.reset ? "Password updated. Please sign in with your new password." : "Welcome back to TASMAY INFOTECH."}>
      <LoginForm next={next} />
    </AuthCard>
  );
}
