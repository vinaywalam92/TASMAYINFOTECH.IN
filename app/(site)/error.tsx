"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold md:text-4xl">We hit a snag loading this page</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">Please try again. If the problem continues, the store may still be getting set up (for example, the database is not connected yet).</p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Go home</Link>
      </div>
    </div>
  );
}
