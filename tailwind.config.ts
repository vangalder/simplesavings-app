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
        // Primary Colors (Teal/Green)
        'primary-base': '#206A5D',
        'primary-dark': '#164A40',
        'primary-light': '#4A9B8E',
        // Secondary Colors (Lime Green)
        'secondary-base': '#81B214',
        'secondary-dark': '#5F8510',
        'secondary-light': '#A5D44A',
        // Accent Colors (Yellow & Orange)
        'accent-base': '#FFCC29',
        'accent-dark': '#E6B825',
        'accent-light': '#FFD966',
        'accent-orange-base': '#F58634',
        'accent-orange-dark': '#D66B1F',
        'accent-orange-light': '#F8A866',
        // Neutral Colors
        'neutral-900': '#0F172A',
        'neutral-800': '#1E293B',
        'neutral-700': '#334155',
        'neutral-600': '#475569',
        'neutral-500': '#64748B',
        'neutral-400': '#94A3B8',
        'neutral-300': '#CBD5E1',
        'neutral-200': '#E2E8F0',
        'neutral-100': '#F1F5F9',
        'neutral-50': '#F8FAFC',
        // Semantic Colors
        'success-base': '#81B214',
        'success-light': '#A5D44A',
        'warning-base': '#FFCC29',
        'warning-light': '#FFD966',
        'error-base': '#DC2626',
        'error-light': '#FCA5A5',
        'info-base': '#206A5D',
        'info-light': '#4A9B8E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Roboto Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
