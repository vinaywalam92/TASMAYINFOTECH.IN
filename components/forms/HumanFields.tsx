"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Bot defences for public forms (verified on the server in lib/spam.ts):
 *  - hidden timestamp: a submission within ~2.5s of render is rejected
 *  - honeypot field that real users never see or fill
 *  - Cloudflare Turnstile widget, only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured
 */
export function HumanFields() {
  const [ts, setTs] = useState("");
  useEffect(() => setTs(String(Date.now())), []);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <>
      <input type="hidden" name="_ts" value={ts} readOnly />
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this field empty
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {siteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
        </>
      ) : null}
    </>
  );
}
