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
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        // Semantic Base Colors
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Brand / Primary Actions
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },

        // Secondary / Muted Actions
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },

        // Accent Colors (for highlights, gradients)
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          purple: "#a855f7",
        },

        // Surface Colors (Cards, Panels, Modals)
        surface: {
          DEFAULT: "var(--surface)",
          secondary: "var(--surface-secondary)", // Slightly different shade
          tertiary: "var(--surface-tertiary)",
          elevated: "var(--surface-elevated)", // For modals/popovers
        },

        // Feedback Colors
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        error: {
          DEFAULT: "var(--error)",
          foreground: "var(--error-foreground)",
        },

        // Borders & Dividers
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },

        // Text Colors (Semantic)
        text: {
          DEFAULT: "var(--foreground)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },

        // CircuitForge Domain Specific
        circuit: {
          canvas: "var(--canvas-bg)",
          grid: "var(--canvas-grid)",
          node: "var(--circuit-node)",
          wire: {
            active: "var(--wire-active)",
            inactive: "var(--wire-inactive)",
          }
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
        'gradient-glow': 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)',
        'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.1)',
        'neon': '0 0 10px var(--primary), 0 0 20px var(--primary)',
        'float': '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px var(--primary)' },
          '100%': { boxShadow: '0 0 20px var(--primary), 0 0 10px var(--accent)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
