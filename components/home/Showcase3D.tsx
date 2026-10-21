"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ProductArt } from "@/components/ui/ProductArt";
import { useInViewOnce, useLiteMode } from "@/hooks/useLiteMode";
import { cn } from "@/lib/utils";

const Scene = dynamic(() => import("@/components/three/ShowcaseScene"), { ssr: false, loading: () => <div className="size-full skeleton" /> });

const ITEMS = [
  { key: "laptop", label: "Laptop", art: "laptops", note: "Stylised model. Drag to rotate, scroll or pinch to zoom." },
  { key: "gpu", label: "Graphics card", art: "accessories", note: "Stylised model. Drag to rotate." },
  { key: "ssd", label: "SSD", art: "storage", note: "Stylised model. Drag to rotate." },
  { key: "printer", label: "Printer", art: "printers", note: "Stylised model. Drag to rotate." },
  { key: "cpu", label: "Processor", art: "accessories", note: "Stylised model. Drag to rotate." },
] as const;

/** Interactive viewer. Three.js is fetched only once the section nears the viewport, and never on lite devices. */
export function Showcase3D() {
  const [item, setItem] = useState<(typeof ITEMS)[number]>(ITEMS[0]);
  const [setNode, seen] = useInViewOnce<HTMLDivElement>("300px");
  const { ready, lite } = useLiteMode();
  const webgl = seen && ready && !lite;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_340px]">
      <div ref={setNode} className="glass glow-border relative aspect-[4/3] overflow-hidden rounded-3xl" role="img" aria-label={`Interactive 3D model of a ${item.label.toLowerCase()}`}>
        {webgl ? (
          <Scene model={item.key} />
        ) : (
          <div className="flex size-full items-center justify-center p-10">
            <div className="w-2/3 animate-drift"><ProductArt kind={item.art} /></div>
          </div>
        )}
        <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-muted">{webgl ? item.note : "Lightweight preview (3D is disabled on this device)."}</p>
      </div>
      <div>
        <div role="tablist" aria-label="Choose a product to view" className="flex flex-wrap gap-2 lg:flex-col">
          {ITEMS.map((it) => (
            <button
              key={it.key}
              role="tab"
              aria-selected={item.key === it.key}
              onClick={() => setItem(it)}
              className={cn("rounded-xl border px-4 py-3 text-left text-sm font-medium transition", item.key === it.key ? "border-electric-500 bg-electric-500/15" : "border-line/15 hover:border-line/30")}
            >
              {it.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Illustrative models for exploring the experience; they are not scans of specific products.</p>
      </div>
    </div>
  );
}
