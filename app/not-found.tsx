import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="aurora pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <Link href="/" aria-label="TASMAY INFOTECH home" className="relative mb-10"><Logo /></Link>
      <p className="eyebrow relative">Error 404</p>
      <h1 className="relative mt-3 text-5xl font-bold md:text-7xl"><span className="text-gradient">Signal lost.</span></h1>
      <p className="relative mt-4 max-w-md text-muted">The page you are looking for has moved, been removed, or never existed. Let us get you back to something useful.</p>
      <div className="relative mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary btn-lg">Back to home</Link>
        <Link href="/store" className="btn-ghost btn-lg">Explore store</Link>
        <Link href="/contact" className="btn-ghost btn-lg">Contact us</Link>
      </div>
    </main>
  );
}
