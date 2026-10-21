import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "1.5rem", lg: "2rem" }, screens: { "2xl": "1360px" } },
    extend: {
      colors: {
        // theme-aware tokens (dark default, .theme-light override in globals.css)
        surface: v("surface"),
        card: v("card"),
        fg: v("fg"),
        muted: v("muted"),
        line: v("line"),
        // brand palette
        ink: { 950: "#05060a", 900: "#0a0c14", 800: "#10131f", 700: "#171b2b", 600: "#222740" },
        electric: { DEFAULT: "#4f7cff", 400: "#6f94ff", 600: "#3a63e6" },
        violet: { DEFAULT: "#8b5cf6", 400: "#a47cf8" },
        cyan: { DEFAULT: "#22d3ee" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(111,148,255,.35), 0 10px 40px -10px rgba(79,124,255,.55)",
        glass: "0 8px 32px rgba(0,0,0,.35)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite", floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};

export default config;
