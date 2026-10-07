import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // FanClash brand palette
        brand: {
          purple: "#7C3AED",
          "purple-light": "#A78BFA",
          "purple-dark": "#5B21B6",
          pink: "#EC4899",
          "pink-light": "#F9A8D4",
          orange: "#F97316",
          "orange-light": "#FED7AA",
          yellow: "#EAB308",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F8F7FF",
          tertiary: "#F3F0FF",
          elevated: "#FFFFFF",
        },
        text: {
          primary: "#1A1A2E",
          secondary: "#4A4A6A",
          muted: "#9090B0",
          inverse: "#FFFFFF",
        },
        status: {
          live: "#EF4444",
          upcoming: "#F97316",
          completed: "#6B7280",
          active: "#10B981",
          eliminated: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.25" }],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card: "0 2px 20px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.15)",
        "brand-sm": "0 4px 14px rgba(124, 58, 237, 0.25)",
        "brand-lg": "0 8px 30px rgba(124, 58, 237, 0.35)",
        "glow-purple": "0 0 40px rgba(124, 58, 237, 0.2)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
        "gradient-hero": "linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #EC4899 100%)",
        "gradient-warm": "linear-gradient(135deg, #EC4899 0%, #F97316 100%)",
        "gradient-card": "linear-gradient(145deg, rgba(124,58,237,0.08) 0%, rgba(236,72,153,0.05) 100%)",
        "gradient-surface": "linear-gradient(180deg, #F8F7FF 0%, #FFFFFF 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-live": "pulseLive 2s infinite",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseLive: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        skeleton: {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "calc(200px + 100%) 0" },
        },
      },
      transitionTimingFunction: {
        "brand": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
