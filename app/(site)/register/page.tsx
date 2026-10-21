import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { AuthCard, RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/account");
  if (await getCurrentUser().catch(() => null)) redirect(next);
  return <AuthCard title="Create your account" subtitle="Track orders, save addresses and check out faster."><RegisterForm next={next} /></AuthCard>;
}
