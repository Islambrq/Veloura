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
          DEFAULT: '#2C5CE0',
          dark: '#1E43AD',
          light: '#EAF0FD',
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
      },
      boxShadow: {
        tag: '0 1px 0 0 rgba(20,23,28,0.06)',
        card: '0 1px 2px rgba(20,23,28,0.04), 0 8px 24px -12px rgba(20,23,28,0.12)',
      },
    },
  },
  plugins: [],
}
