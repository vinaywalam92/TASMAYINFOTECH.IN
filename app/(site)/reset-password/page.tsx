import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, ResetForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  if (!token) return <AuthCard title="Link not valid"><p className="text-sm text-muted">This reset link is missing its token. <Link className="underline" href="/forgot-password">Request a new one</Link>.</p></AuthCard>;
  return <AuthCard title="Choose a new password"><ResetForm token={token} /></AuthCard>;
}
