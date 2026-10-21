import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return <PolicyPage policyKey="privacy" title="Privacy Policy" />;
}
