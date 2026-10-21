import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Cancellation Policy" };

export default function Page() {
  return <PolicyPage policyKey="cancellation" title="Cancellation Policy" />;
}
