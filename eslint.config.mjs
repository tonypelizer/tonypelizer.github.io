import js from '@eslint/js';
import globals from 'globals';
import astro from 'eslint-plugin-astro';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  // Ignore generated / build output
  {
    ignores: ['node_modules/**', 'dist/**', '.astro/**'],
  },

  // JS recommended rules
  js.configs.recommended,

  // Parse TS (handles .ts / .d.ts safely)
  ...tseslint.configs.recommended,

  // Astro recommended rules (for .astro files)
  ...astro.configs.recommended,

  // Browser globals for typical front-end code
  {
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Prevent ESLint rules that conflict with Prettier
  prettierConfig,
];
