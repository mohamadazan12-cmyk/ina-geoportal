/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        figma: {
          primary: '#1A3BAF',
          navy: '#0C1D36',
          bg: '#F1F7FA',
          card: '#FFFFFF',
          tabBg: '#D9D9D9',
          dark: '#1E1E1E',
          muted: '#717171',
          border: 'rgba(26, 59, 175, 0.5)',
          borderSubtle: '#E2E8F0',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        inagreen: {
          DEFAULT: '#00875A',
          dark: '#006644',
          light: '#E3FCEF',
        },
        inablue: {
          DEFAULT: '#0052CC',
          dark: '#0747A6',
          light: '#DEEBFF',
        }
      }
    },
  },
  plugins: [],
}
