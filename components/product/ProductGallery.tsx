"use client";

import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { ProductArt } from "@/components/ui/ProductArt";
import { cn } from "@/lib/utils";

type Img = { url: string; alt: string | null };

/** Thumbnail gallery with hover/tap zoom. Falls back to a vector illustration when there are no photos. */
export function ProductGallery({ images, name, iconKey }: { images: Img[]; name: string; iconKey: string | null }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const cur = images[i];

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden rounded-3xl border border-line/15 bg-card"
        onPointerMove={(e) => {
          if (!zoom || e.pointerType === "touch") return;
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setZoom(false)}
      >
        {cur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cur.url}
            alt={cur.alt || name}
            decoding="async"
            className={cn("size-full object-contain p-4 transition-transform duration-200", zoom && "scale-[2.2]")}
            style={zoom ? { transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}
          />
        ) : (
          <div className="flex size-full items-center justify-center p-12" role="img" aria-label={`${name} (illustration, no photo yet)`}>
            <ProductArt kind={iconKey} />
          </div>
        )}
        {cur ? (
          <button
            type="button"
            aria-pressed={zoom}
            onClick={() => setZoom((z) => !z)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-line/15 bg-card/80 px-3 py-1.5 text-xs backdrop-blur"
          >
            <ZoomIn className="size-3.5" aria-hidden="true" /> {zoom ? "Zoom out" : "Zoom"}
          </button>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Product images">
          {images.map((im, idx) => (
            <li key={im.url}>
              <button
                type="button"
                onClick={() => { setI(idx); setZoom(false); }}
                aria-label={`Show image ${idx + 1} of ${images.length}`}
                aria-current={idx === i}
                className={cn("size-16 overflow-hidden rounded-xl border bg-card", idx === i ? "border-electric-500" : "border-line/15")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" loading="lazy" decoding="async" className="size-full object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
