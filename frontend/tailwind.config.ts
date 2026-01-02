import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic colors using CSS variables for light/dark mode
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Surface colors (cards, panels, etc.)
        surface: {
          DEFAULT: "var(--surface)",
          secondary: "var(--surface-secondary)",
          elevated: "var(--surface-elevated)",
        },
        
        // Border colors
        border: {
          DEFAULT: "var(--border)",
          muted: "var(--border-muted)",
        },
        
        // Text colors
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        
        // Brand colors - blue/slate gradient theme
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        
        // Accent colors - blue/slate theme
        accent: {
          primary: "#0ea5e9",
          blue: "#3b82f6",
          slate: "#475569",
          cyan: "#06b6d4",
        },
        
        // CircuitForge specific colors
        circuit: {
          primary: "#3B82F6",
          secondary: "#6B7280",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          signal: {
            high: "#22C55E",
            low: "#9CA3AF",
            error: "#EF4444",
          },
          annotation: {
            black: "#000000",
            red: "#EF4444",
            blue: "#3B82F6",
            green: "#22C55E",
            orange: "#F97316",
            purple: "#A855F7",
            brown: "#92400E",
            white: "#FFFFFF",
          },
          canvas: {
            bg: "var(--canvas-bg)",
            grid: "var(--canvas-grid)",
            border: "var(--canvas-border)",
          },
        },
      },
      // Stroke widths for annotations
      strokeWidth: {
        thin: "2px",
        medium: "4px",
        thick: "8px",
      },
      // Box shadows for elevation - blue glow
      boxShadow: {
        'glow-sm': '0 0 10px rgba(14, 165, 233, 0.2)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-lg': '0 0 30px rgba(14, 165, 233, 0.4)',
        'glow-xl': '0 0 40px rgba(14, 165, 233, 0.5)',
      },
      // Background images for gradients - blue/slate
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-blue) 100%)',
        'gradient-hero': 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
