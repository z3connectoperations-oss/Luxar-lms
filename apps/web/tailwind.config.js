/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Luxaar V2 — Premium Black + White + Gold ──
        canvas: "#FAFAF8",        // warm off-white workspace
        "canvas-alt": "#FCFCFB",  // section background
        card: "#FFFFFF",
        border: "#E5E7EB",
        divider: "#F3F4F6",
        ink: "#111111",           // primary text / dark surfaces
        muted: "#6B7280",         // secondary text
        faint: "#9CA3AF",         // placeholder / disabled
        disabled: "#C4C4C4",

        // Sidebar
        sidebar: "#0F0F0F",

        // Gold accent palette (the luxury accent)
        gold: {
          50: "#FCFAF5",
          100: "#F8F2E6",
          200: "#F4E8D3", // Secondary Gold (Highlights, Active States)
          300: "#E5D5B5", // Primary Gold (Borders, Button Hovers)
          400: "#D6C08D",
          500: "#C7A75B", // Gold Text (Headers, Accents)
          600: "#B9933F",
          700: "#987728",
        },

        // "brand" maps to gold for backward compat with existing classes
        brand: {
          50: "#FCFAF5",
          100: "#F8F2E6",
          200: "#F4E8D3",
          300: "#E5D5B5",
          400: "#D6C08D",
          500: "#C7A75B",
          600: "#B9933F",
          700: "#987728",
          800: "#111111",
          900: "#0A0A0A",
        },

        // CTA maps to gold for accent CTAs
        cta: {
          50: "#FCFAF5",
          100: "#F8F2E6",
          200: "#F2E4C5",
          400: "#D6C08D",
          500: "#C7A75B",
          600: "#B9933F",
          700: "#987728",
        },

        // Semantic tones (cards / chips / stat blocks)
        accent: { pink: "#C7A75B", yellow: "#B9933F", blue: "#987728" },
        container: { pink: "#FCFAF5", yellow: "#F8F2E6", blue: "#F2E4C5" },

        // Status colors (kept for semantic meaning)
        success: "#16A34A",
        warning: "#EAB308",
        danger: "#DC2626",
        info: "#2563EB",
      },
      borderRadius: { xl: "0.75rem", "2xl": "1rem", "3xl": "1.5rem" },
      boxShadow: {
        card: "0 1px 3px rgba(17,17,17,0.04)",
        soft: "0 4px 24px -8px rgba(17,17,17,0.10)",
        lux: "0 20px 60px -20px rgba(17,17,17,0.18)",
        "gold-glow": "0 0 0 3px rgba(199,167,91,0.15)",
      },
      maxWidth: { content: "1280px" },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },
      // Animation utilities (keyframes live in index.css).
      animation: {
        marquee: "marquee 30s linear infinite",
        float: "float 4s ease-in-out infinite",
        scroll: "scroll 45s linear infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out both",
        "count-up": "countUp 0.5s ease-out both",
        glow: "glow 3s ease-in-out infinite",
        mesh: "mesh 20s linear infinite",
      },
    },
  },
  plugins: [],
};
