import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#1E2E6E',
          700: '#2D45A8',
          500: '#4A6BC4',
          100: '#E8EDF8',
        },
        neutral: {
          900: '#0F1218',
          50: '#F8F9FC',
        },
        success: '#16A34A',
        info: '#0284C7',
        warning: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
