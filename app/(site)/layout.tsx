import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CompareBar } from "@/components/compare/CompareBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";
import { getNavSafe } from "@/lib/catalog";

async function safeUserName(): Promise<string | null> {
  try {
    return (await getCurrentUser())?.name ?? null;
  } catch {
    return null; // DB unreachable: render as signed-out rather than failing the whole page
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categories, userName] = await Promise.all([getNavSafe(), safeUserName()]);
  return (
    <CartProvider>
      <a href="#main" className="sr-only z-[100] rounded-lg bg-electric px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>
      <Header categories={categories} userName={userName} />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <CompareBar />
    </CartProvider>
  );
}
