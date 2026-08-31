/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cff4fc',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          900: '#164e63',
          950: '#083344',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.72', transform: 'scale(0.97)' },
        },
        'signal-flow': {
          '0%': { transform: 'translateX(-120%)', opacity: '0' },
          '20%, 80%': { opacity: '1' },
          '100%': { transform: 'translateX(220%)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 500ms ease-out both',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'signal-flow': 'signal-flow 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
