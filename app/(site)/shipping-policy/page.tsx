import type { Metadata } from "next";
import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata: Metadata = { title: "Shipping Policy" };

export default function Page() {
  return <PolicyPage policyKey="shipping" title="Shipping Policy" />;
}
