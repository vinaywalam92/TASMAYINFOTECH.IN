"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-triggered entrance using GSAP + ScrollTrigger, loaded lazily so pages without reveals
 * ship no animation code. Content is fully visible without JS and under prefers-reduced-motion.
 * Set `stagger` to animate children marked with data-reveal one after another.
 */
export function Reveal({ children, className, stagger = false, y = 36 }: { children: ReactNode; className?: string; stagger?: boolean; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const targets = stagger ? el.querySelectorAll("[data-reveal]") : el;
        if (stagger && !(targets as NodeListOf<Element>).length) return;
        gsap.from(targets, {
          y,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: stagger ? 0.09 : 0,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      }, el);
      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [stagger, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
