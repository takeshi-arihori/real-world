import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['coverage', 'dist']),
  {
    // BFF は Node.js 上で動く TypeScript なので、browser globals は使わない。
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.node,
      sourceType: 'module',
    },
  },
]);
