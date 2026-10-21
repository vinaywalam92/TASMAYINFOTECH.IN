import type { Metadata } from "next";
import { AuthCard, ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return <AuthCard title="Reset your password" subtitle="Enter your account email and we will send a reset link."><ForgotForm /></AuthCard>;
}
