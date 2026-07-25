import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // GitHub Pages serves this repo at github.io/Veloura/, not at the domain
  // root, so every asset URL needs that prefix or they'll 404. Vercel/Netlify
  // don't need this since they serve from a root domain — this is specific
  // to GitHub Pages' project-site URL structure.
  base: '/Veloura/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['node_modules', 'e2e/**'],
  },
})
