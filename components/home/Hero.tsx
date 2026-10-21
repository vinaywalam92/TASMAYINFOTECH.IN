"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { ProductArt } from "@/components/ui/ProductArt";
import { useIsVisible, useLiteMode } from "@/hooks/useLiteMode";

/**
 * Cinematic hero. Full WebGL showroom on capable desktops; a light, animated SVG composition on
 * phones, low-power devices, data-saver mode, no-WebGL browsers and for reduced-motion users.
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { ready, lite } = useLiteMode();
  const [setVisibleNode, visible] = useIsVisible<HTMLDivElement>();

  // Scroll-scrubbed exit: copy drifts up and softens, the stage eases back. GSAP loads lazily.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled || !section.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const trigger = { trigger: section.current, start: "top top", end: "bottom top", scrub: true } as const;
        gsap.to(text.current, { y: -70, opacity: 0.15, ease: "none", scrollTrigger: trigger });
        gsap.to(stage.current, { scale: 1.08, opacity: 0.35, ease: "none", scrollTrigger: trigger });
      }, section);
      revert = () => ctx.revert();
    })();
    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  const showWebGL = ready && !lite;

  return (
    <section ref={section} aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden="true" />

      <div ref={setVisibleNode} className="relative min-h-[calc(100svh-120px)] lg:min-h-[760px]">
        {/* Stage: WebGL canvas or lightweight fallback */}
        <div ref={stage} className="absolute inset-0 will-change-transform" aria-hidden="true">
          {showWebGL ? (
            <HeroCanvas active={visible} eventSource={section} />
          ) : (
            <div className="absolute inset-x-0 bottom-0 top-1/2 lg:left-1/2 lg:top-0">
              <div className="relative mx-auto h-full max-w-xl">
                <div className="animate-drift absolute left-[6%] top-[8%] w-[46%]"><ProductArt kind="laptops" /></div>
                <div className="animate-drift absolute right-[4%] top-[2%] w-[30%]" style={{ animationDelay: "-2s" }}><ProductArt kind="printers" /></div>
                <div className="animate-drift absolute bottom-[8%] left-[2%] w-[30%]" style={{ animationDelay: "-4s" }}><ProductArt kind="storage" /></div>
                <div className="animate-drift absolute bottom-[10%] right-[10%] w-[34%]" style={{ animationDelay: "-1s" }}><ProductArt kind="networking" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Copy (never covers the canvas' pointer events except for the buttons) */}
        <div className="container-x pointer-events-none relative z-10 flex min-h-[inherit] items-center py-16">
          <div ref={text} className="max-w-2xl">
            <p className="eyebrow animate-rise" style={{ animationDelay: ".1s" }}>TASMAY INFOTECH · Technology showroom</p>
            <h1 id="hero-title" className="mt-5 text-5xl font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="block animate-rise" style={{ animationDelay: ".25s" }}>TECHNOLOGY.</span>
              <span className="text-gradient block animate-rise" style={{ animationDelay: ".45s" }}>REIMAGINED.</span>
            </h1>
            <p className="animate-rise mt-6 max-w-xl text-base text-muted sm:text-lg" style={{ animationDelay: ".65s" }}>
              Discover smarter technology, reliable IT essentials, and powerful solutions for work, business, and everyday life.
            </p>
            <div className="animate-rise pointer-events-auto mt-9 flex flex-wrap gap-3" style={{ animationDelay: ".85s" }}>
              <Link href="/store" className="btn-primary btn-lg group">
                EXPLORE STORE
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/business-solutions" className="btn-ghost btn-lg">BUSINESS SOLUTIONS</Link>
            </div>
          </div>
        </div>

        <a href="#categories" className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs text-muted transition hover:text-fg md:flex" aria-label="Scroll to categories">
          Scroll
          <ChevronDown className="size-4 animate-bounce" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
