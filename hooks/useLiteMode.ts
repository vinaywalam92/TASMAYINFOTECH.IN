"use client";

import { useEffect, useState } from "react";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Decides whether to serve the lightweight (non-WebGL) experience:
 * reduced-motion preference, phones/small screens, low memory / few CPU cores, data-saver, or no WebGL.
 * `ready` is false during SSR and the first paint so callers can show the static fallback until decided.
 */
export function useLiteMode(): { ready: boolean; lite: boolean } {
  const [state, setState] = useState({ ready: false, lite: true });
  useEffect(() => {
    const nav = navigator as Nav;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const weak = (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2;
    const saver = !!nav.connection?.saveData;
    setState({ ready: true, lite: reduce || small || weak || saver || !webglAvailable() });
  }, []);
  return state;
}

/** True once `el` has entered the viewport (one-shot). Used to lazy-mount WebGL scenes. */
export function useInViewOnce<T extends Element>(rootMargin = "200px") {
  const [seen, setSeen] = useState(false);
  const [node, setNode] = useState<T | null>(null);
  useEffect(() => {
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, seen, rootMargin]);
  return [setNode, seen] as const;
}

/** Live visibility (true while on screen) — lets a scene pause rendering when scrolled away. */
export function useIsVisible<T extends Element>() {
  const [visible, setVisible] = useState(true);
  const [node, setNode] = useState<T | null>(null);
  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), { threshold: 0.01 });
    io.observe(node);
    return () => io.disconnect();
  }, [node]);
  return [setNode, visible] as const;
}
