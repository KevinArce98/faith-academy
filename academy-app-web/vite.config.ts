import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules\/(react|react-dom|react-router-dom)\// },
            { name: 'query-vendor', test: /node_modules\/@tanstack\/react-query\// },
            { name: 'motion-vendor', test: /node_modules\/framer-motion\// },
          ],
        },
      },
    },
  },
});
