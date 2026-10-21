"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Vector product illustrations (no external assets) used for category cards and as image fallbacks. */
export type ArtKey = "laptops" | "printers" | "toner" | "accessories" | "storage" | "networking" | "cctv" | "office";

export function ProductArt({ kind, className }: { kind?: string | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = `url(#a-${id})`;
  const g2 = `url(#b-${id})`;
  const k = (kind ?? "accessories") as ArtKey;
  const fill = "rgb(var(--card) / .55)";
  const body = (() => {
    switch (k) {
      case "laptops":
        return (
          <>
            <rect x="46" y="26" width="108" height="72" rx="8" stroke={g} strokeWidth="2.5" fill={fill} />
            <rect x="54" y="34" width="92" height="56" rx="4" fill={g2} fillOpacity=".22" />
            <path d="M62 50h40M62 60h58M62 70h30" stroke={g} strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
            <path d="M26 106h148l-9 14H35l-9-14Z" stroke={g} strokeWidth="2.5" fill={fill} strokeLinejoin="round" />
            <path d="M88 113h24" stroke={g2} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case "printers":
        return (
          <>
            <rect x="58" y="24" width="84" height="34" rx="4" stroke={g} strokeWidth="2.5" fill={fill} />
            <rect x="30" y="56" width="140" height="56" rx="12" stroke={g} strokeWidth="2.5" fill={fill} />
            <rect x="56" y="96" width="88" height="40" rx="3" stroke={g2} strokeWidth="2.5" fill="rgb(var(--fg) / .08)" />
            <path d="M68 108h64M68 118h44" stroke={g2} strokeWidth="2" strokeLinecap="round" opacity=".8" />
            <circle cx="150" cy="72" r="4" fill="#22d3ee" /><circle cx="136" cy="72" r="4" fill="#8b5cf6" />
          </>
        );
      case "toner":
        return (
          <>
            <rect x="42" y="48" width="116" height="58" rx="12" stroke={g} strokeWidth="2.5" fill={fill} />
            <rect x="42" y="64" width="116" height="26" fill={g2} fillOpacity=".2" />
            <circle cx="64" cy="106" r="8" stroke={g2} strokeWidth="2.5" fill="none" />
            <circle cx="136" cy="106" r="8" stroke={g2} strokeWidth="2.5" fill="none" />
            <path d="M100 26c10 14 14 20 14 27a14 14 0 0 1-28 0c0-7 4-13 14-27Z" stroke={g} strokeWidth="2.5" fill={g2} fillOpacity=".3" strokeLinejoin="round" />
            <path d="M58 77h50" stroke={g} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case "storage":
        return (
          <>
            <rect x="40" y="30" width="120" height="86" rx="12" stroke={g} strokeWidth="2.5" fill={fill} />
            <rect x="54" y="44" width="34" height="26" rx="4" fill={g2} fillOpacity=".35" stroke={g2} strokeWidth="2" />
            <rect x="96" y="44" width="50" height="10" rx="3" fill="rgb(var(--fg) / .12)" />
            <rect x="96" y="60" width="34" height="10" rx="3" fill="rgb(var(--fg) / .12)" />
            <path d="M54 92h92" stroke={g} strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
            <rect x="64" y="116" width="72" height="12" rx="3" stroke={g2} strokeWidth="2.5" fill={g2} fillOpacity=".25" />
          </>
        );
      case "networking":
        return (
          <>
            <path d="M62 82 54 38M138 82l8-44" stroke={g} strokeWidth="3.5" strokeLinecap="round" />
            <rect x="30" y="82" width="140" height="38" rx="10" stroke={g} strokeWidth="2.5" fill={fill} />
            <circle cx="56" cy="101" r="4" fill="#22d3ee" /><circle cx="72" cy="101" r="4" fill="#6f94ff" /><circle cx="88" cy="101" r="4" fill="#8b5cf6" />
            <path d="M120 101h36" stroke={g2} strokeWidth="3" strokeLinecap="round" />
            <path d="M82 38a26 26 0 0 1 36 0M90 48a14 14 0 0 1 20 0" stroke={g2} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        );
      case "cctv":
        return (
          <>
            <path d="M40 30v40" stroke={g} strokeWidth="4" strokeLinecap="round" />
            <path d="M40 48h34" stroke={g} strokeWidth="3" strokeLinecap="round" />
            <g transform="rotate(14 100 66)">
              <rect x="66" y="46" width="76" height="40" rx="10" stroke={g} strokeWidth="2.5" fill={fill} />
              <rect x="142" y="52" width="14" height="28" rx="4" stroke={g2} strokeWidth="2.5" fill={g2} fillOpacity=".3" />
              <circle cx="86" cy="66" r="5" fill="#22d3ee" className="animate-glow" />
            </g>
            <path d="M54 112h92M70 124h60" stroke={g2} strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
          </>
        );
      case "office":
        return (
          <>
            <rect x="52" y="34" width="84" height="92" rx="6" stroke={g} strokeWidth="2.5" fill={fill} transform="rotate(-6 94 80)" />
            <rect x="62" y="30" width="84" height="92" rx="6" stroke={g} strokeWidth="2.5" fill={fill} />
            <path d="M74 52h60M74 66h60M74 80h40" stroke={g2} strokeWidth="2.5" strokeLinecap="round" opacity=".85" />
            <path d="M150 110l22-48" stroke={g} strokeWidth="6" strokeLinecap="round" />
            <path d="M150 110l-3 10 10-4" stroke="#22d3ee" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
          </>
        );
      case "accessories":
      default:
        return (
          <>
            <rect x="22" y="76" width="112" height="52" rx="10" stroke={g} strokeWidth="2.5" fill={fill} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={`r1-${i}`} x={32 + i * 16} y="86" width="11" height="9" rx="2" fill={g2} fillOpacity=".45" />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={`r2-${i}`} x={38 + i * 16} y="100" width="11" height="9" rx="2" fill={g2} fillOpacity=".3" />
            ))}
            <rect x="42" y="113" width="72" height="8" rx="2" fill={g2} fillOpacity=".3" />
            <path d="M166 66c-14 0-22 10-22 26v14c0 12 10 20 22 20s22-8 22-20V92c0-16-8-26-22-26Z" stroke={g} strokeWidth="2.5" fill={fill} />
            <path d="M166 66v26M144 92h44" stroke={g2} strokeWidth="2.5" />
          </>
        );
    }
  })();

  return (
    <svg viewBox="0 0 200 150" fill="none" role="img" aria-hidden="true" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id={`a-${id}`} x1="0" y1="0" x2="200" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8fb0ff" /><stop offset="1" stopColor="#a47cf8" />
        </linearGradient>
        <linearGradient id={`b-${id}`} x1="0" y1="150" x2="200" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" /><stop offset="1" stopColor="#6f94ff" />
        </linearGradient>
      </defs>
      {body}
    </svg>
  );
}
