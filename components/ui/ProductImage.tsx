import { cn } from "@/lib/utils";
import { ProductArt } from "./ProductArt";

/**
 * Product photo with a vector fallback when the product has no image yet.
 * Uses a plain <img> (lazy, async-decoded) because admin-supplied image hosts are not known at build
 * time. Once your images live on one CDN, set IMAGE_HOSTS and swap this for next/image.
 */
export function ProductImage({
  src,
  alt,
  iconKey,
  className,
  eager = false,
}: {
  src?: string | null;
  alt: string;
  iconKey?: string | null;
  className?: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center p-6", className)} role="img" aria-label={`${alt} (illustration)`}>
        <ProductArt kind={iconKey} className="max-h-full" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      width={600}
      height={600}
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
