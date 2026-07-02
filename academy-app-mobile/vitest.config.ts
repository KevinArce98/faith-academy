import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests de lógica pura (utils, roles, tipos de dominio). No renderiza RN.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
