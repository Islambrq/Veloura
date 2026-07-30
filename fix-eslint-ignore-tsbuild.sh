#!/data/data/com.termux/files/usr/bin/bash
set -e
cat > "eslint.config.js" << 'VELOURA_EOF'
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // TypeScript already catches genuinely undefined identifiers (with full
      // knowledge of DOM/Node/Deno lib globals); the base no-undef rule doesn't
      // know about those globals and false-positives on window, fetch, Deno, etc.
      'no-undef': 'off',
    },
  },
  { ignores: ['dist/**', 'node_modules/**', '.tsbuild-node/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },
]
VELOURA_EOF

echo "eslint.config.js updated. Now run: npm run lint"
