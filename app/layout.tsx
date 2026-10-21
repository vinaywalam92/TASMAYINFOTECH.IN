import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

// Pages read cookies (cart, session) and the database, so render per request.
export const dynamic = "force-dynamic";

const description =
  "TASMAY INFOTECH: computers, printers, toner and ink, accessories, storage, networking and office supplies, with business and institutional procurement support.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | Technology. Reimagined.`, template: `%s | ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, title: `${SITE_NAME} | Technology. Reimagined.`, description, locale: "en_IN", url: SITE_URL },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} | Technology. Reimagined.`, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#06080e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
