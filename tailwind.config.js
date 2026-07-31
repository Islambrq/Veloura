/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14171C',
          soft: '#2A2E36',
        },
        porcelain: {
          DEFAULT: '#EEEAE2',
          dim: '#E3DED2',
        },
        cobalt: {
          DEFAULT: '#8A2846',
          dark: '#6B1D36',
          light: '#F7E9EE',
        },
        flame: {
          DEFAULT: '#E8432E',
          dark: '#C13320',
        },
        gold: {
          DEFAULT: '#B8935B',
          dark: '#93743F',
        },
        line: '#D9D4C7',
        success: '#2F6F4E',
        danger: '#B3432E',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '10px',
        xl: '16px',
        '2xl': '22px',
      },
      boxShadow: {
        tag: '0 1px 0 0 rgba(20,23,28,0.06)',
        card: '0 1px 2px rgba(20,23,28,0.04), 0 8px 24px -12px rgba(20,23,28,0.12)',
        pop: '0 2px 4px rgba(20,23,28,0.05), 0 14px 28px -10px rgba(20,23,28,0.18)',
        nav: '0 -1px 0 0 rgba(20,23,28,0.06), 0 -8px 20px -12px rgba(20,23,28,0.1)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
      },
    },
  },
  plugins: [],
}
