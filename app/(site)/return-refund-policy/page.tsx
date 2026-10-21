import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Return & Refund Policy" };

export default function Page() {
  return <PolicyPage policyKey="returns" title="Return & Refund Policy" />;
}
