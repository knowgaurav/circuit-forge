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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // CircuitForge custom colors
        circuit: {
          primary: "#3B82F6",    // Blue - primary actions
          secondary: "#6B7280", // Gray - secondary elements
          success: "#22C55E",   // Green - HIGH signal, success
          warning: "#F59E0B",   // Amber - warnings
          danger: "#EF4444",    // Red - errors, LOW signal
          // Signal colors for simulation
          signal: {
            high: "#22C55E",    // Green wire
            low: "#9CA3AF",     // Gray wire
            error: "#EF4444",   // Red wire (undefined/error)
          },
          // Annotation colors (8 colors from requirements)
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
          // Canvas colors
          canvas: {
            bg: "#F8FAFC",
            grid: "#E2E8F0",
            border: "#CBD5E1",
          },
        },
      },
      // Stroke widths for annotations
      strokeWidth: {
        thin: "2px",
        medium: "4px",
        thick: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
