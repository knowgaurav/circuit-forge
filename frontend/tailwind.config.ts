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
        sans: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
        heading: ["var(--font-display)", "sans-serif"],
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

        // Accent Colors (power-rail amber)
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          cyan: "#22d3ee",
          purple: "#a855f7",
        },

        // Surface Colors (Cards, Panels, Modals)
        surface: {
          DEFAULT: "var(--surface)",
          secondary: "var(--surface-secondary)",
          tertiary: "var(--surface-tertiary)",
          elevated: "var(--surface-elevated)",
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
        'gradient-brand': 'linear-gradient(105deg, var(--primary) 0%, var(--accent) 100%)',
        'gradient-glow': 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 28px -12px rgba(0, 0, 0, 0.5)',
        'glass-sm': '0 4px 16px -8px rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 24px 60px -24px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 0 1px color-mix(in srgb, var(--primary) 40%, transparent), 0 0 22px -4px color-mix(in srgb, var(--primary) 55%, transparent)',
        'glow-lg': '0 0 0 1px color-mix(in srgb, var(--primary) 55%, transparent), 0 0 40px -6px color-mix(in srgb, var(--primary) 70%, transparent)',
        'float': '0 10px 30px -10px rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2.4s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'fade-in-up': 'fadeInUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'dash': 'dash 1.2s linear infinite',
        'grid-pan': 'gridPan 24s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px -2px var(--primary)' },
          '100%': { boxShadow: '0 0 26px -2px var(--primary), 0 0 12px -4px var(--accent)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        dash: {
          to: { 'stroke-dashoffset': '-16' },
        },
        gridPan: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '32px 32px' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
