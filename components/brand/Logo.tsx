"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * TASMAY INFOTECH mark: a hexagonal chip with a "T" drawn as a circuit trace.
 * The trace draws itself once on load (disabled automatically under prefers-reduced-motion).
 * This is an original concept mark; replace with your final logo artwork when you have one.
 */
export function LogoMark({ size = 36, animated = true, className }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const draw = animated ? { strokeDasharray: 120, strokeDashoffset: 120, animation: "draw 1.6s .2s ease forwards" } : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={`g-${id}`} x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6f94ff" />
          <stop offset=".55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21L24 3Z" stroke={`url(#g-${id})`} strokeWidth="2" fill={`url(#g-${id})`} fillOpacity=".08" strokeLinejoin="round" />
      <path d="M14.5 18H33.5M24 18v16.5" stroke={`url(#g-${id})`} strokeWidth="3.2" strokeLinecap="round" style={draw} />
      <circle cx="14.5" cy="18" r="2.2" fill="#6f94ff" />
      <circle cx="33.5" cy="18" r="2.2" fill="#22d3ee" />
      <circle cx="24" cy="34.5" r="2.2" fill="#8b5cf6" />
    </svg>
  );
}

export function Logo({ className, size = 36, animated = true }: { className?: string; size?: number; animated?: boolean }) {
  return (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} animated={animated} className="transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.15rem] font-bold tracking-[0.14em]">TASMAY</span>
        <span className="mt-1 text-[0.58rem] font-semibold tracking-[0.46em] text-muted">INFOTECH</span>
      </span>
    </span>
  );
}
