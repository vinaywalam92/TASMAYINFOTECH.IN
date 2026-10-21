"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingText, className }: { children: ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn("btn-primary", className)}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      <span>{pending && pendingText ? pendingText : children}</span>
    </button>
  );
}
