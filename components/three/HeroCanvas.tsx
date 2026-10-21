"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";

// Three.js + R3F are only downloaded when this component actually mounts (never on phones / reduced motion).
const Scene = dynamic(() => import("./HeroScene3D"), { ssr: false, loading: () => null });

export function HeroCanvas({ active, eventSource }: { active: boolean; eventSource: RefObject<HTMLElement | null> }) {
  return <Scene active={active} eventSource={eventSource} />;
}
